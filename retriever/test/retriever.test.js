import { describe, it, expect, vi } from 'vitest'
import workerImpl from '../bin/retriever.js'
import { createHash } from 'node:crypto'
import {
  retrieveFile,
  retrieveFile as defaultRetrieveFile,
} from '../lib/retrieval.js'
import { env } from 'cloudflare:test'
import assert from 'node:assert/strict'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const DNS_ROOT = '.walcdn.io'
env.DNS_ROOT = DNS_ROOT

describe('retriever.fetch', () => {
  const defaultClientBase32Address =
    '3rkdb89wnwzj3f2i7hnvuyna5vn7glk9vf3igtht9x6ejmboly'
  const defaultClientHexAddress =
    '0x9716a65b4ed415a043aa2b927fa73bcee0ecd2426b4f360fc05a9c0a0413b356'
  const realBlobId = 'lTg8X_Jf3zvWDAxutgcINWCoPBHo9fT6hXw3MoN-3cc'
  const aggregatorUrl = 'https://agg.walcdn.io'
  const realAggregatorUrl = 'https://agg.walrus.eosusa.io'
  const defaultGetAggregator = (_) => aggregatorUrl

  const worker = {
    fetch: async (
      request,
      env,
      {
        retrieveFile = defaultRetrieveFile,
        getAggregator = defaultGetAggregator,
      } = {},
    ) => {
      const waitUntilCalls = []
      const ctx = {
        waitUntil: (promise) => {
          waitUntilCalls.push(promise)
        },
      }
      const response = await workerImpl.fetch(request, env, ctx, {
        retrieveFile,
        getAggregator,
      })
      await Promise.all(waitUntilCalls)
      return response
    },
  }

  it('returns 405 for non-GET requests', async () => {
    const req = withRequest(1, 'foo', 'POST')
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(405)
    expect(await res.text()).toBe('Method Not Allowed')
  })

  it('returns 400 if required fields are missing', async () => {
    const mockRetrieveFile = vi.fn()
    const req = withRequest(undefined, 'foo')
    const res = await worker.fetch(req, env, { retrieveFile: mockRetrieveFile })
    expect(res.status).toBe(400)
    expect(await res.text()).toBe(
      'Invalid hostname: walcdn.io. It must end with .walcdn.io.',
    )
  })

  it('returns 400 if provided client address is invalid', async () => {
    const mockRetrieveFile = vi.fn()
    const req = withRequest('bar', realBlobId)
    const res = await worker.fetch(req, env, { retrieveFile: mockRetrieveFile })
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('Address must be a valid sui address.')
  })

  it('returns the response from retrieveFile', async () => {
    const fakeResponse = new Response('hello', {
      status: 201,
      headers: { 'X-Test': 'yes' },
    })
    const mockRetrieveFile = vi.fn().mockResolvedValue({
      response: fakeResponse,
      cacheMiss: true,
    })
    const req = withRequest(defaultClientBase32Address, realBlobId)
    const res = await worker.fetch(req, env, { retrieveFile: mockRetrieveFile })
    expect(res.status).toBe(201)
    expect(await res.text()).toBe('hello')
    expect(res.headers.get('X-Test')).toBe('yes')
  })

  it('fetches the file from mainnet aggregator', async () => {
    const expectedHash =
      '033918bae6587123f552359a1a100a05e1031216a830f0561b133029bd568cc0'

    const req = withRequest(defaultClientBase32Address, realBlobId)
    const res = await worker.fetch(req, env, {
      retrieveFile,
      getAggregator: (_) => realAggregatorUrl,
    })
    expect(res.status).toBe(200)
    // get the sha256 hash of the content
    const content = await res.bytes()
    const hash = createHash('sha256').update(content).digest('hex')
    expect(hash).toEqual(expectedHash)
  })

  it('stores retrieval results with cache miss and content length set in D1', async () => {
    const body = 'file content'
    const expectedEgressBytes = Buffer.byteLength(body, 'utf8')
    const fakeResponse = new Response(body, {
      status: 200,
      headers: {
        'CF-Cache-Status': 'MISS',
      },
    })
    const mockRetrieveFile = vi.fn().mockResolvedValue({
      response: fakeResponse,
      cacheMiss: true,
    })
    const req = withRequest(defaultClientBase32Address, realBlobId)
    const res = await worker.fetch(req, env, { retrieveFile: mockRetrieveFile })
    assert.strictEqual(res.status, 200)
    const readOutput = await env.DB.prepare(
      `SELECT id, response_status, egress_bytes, cache_miss, client_address
       FROM retrieval_logs
       WHERE client_address = ?`,
    )
      .bind(defaultClientHexAddress)
      .all()
    const result = readOutput.results
    assert.deepStrictEqual(result, [
      {
        id: 1, // Assuming this is the first log entry
        client_address: defaultClientHexAddress,
        response_status: 200,
        egress_bytes: expectedEgressBytes,
        cache_miss: 1, // 1 for true, 0 for false
      },
    ])
  })
  it('stores retrieval results with cache hit and content length set in D1', async () => {
    const body = 'file content'
    const expectedEgressBytes = Buffer.byteLength(body, 'utf8')
    const fakeResponse = new Response(body, {
      status: 200,
      headers: {
        'CF-Cache-Status': 'HIT',
      },
    })
    const mockRetrieveFile = vi.fn().mockResolvedValue({
      response: fakeResponse,
      cacheMiss: false,
    })
    const req = withRequest(defaultClientBase32Address, realBlobId)
    const res = await worker.fetch(req, env, { retrieveFile: mockRetrieveFile })
    assert.strictEqual(res.status, 200)
    const readOutput = await env.DB.prepare(
      `SELECT id, response_status, egress_bytes, cache_miss, client_address
       FROM retrieval_logs
       WHERE client_address = ?`,
    )
      .bind(defaultClientHexAddress)
      .all()
    const result = readOutput.results
    assert.deepStrictEqual(result, [
      {
        id: 1, // Assuming this is the first log entry
        client_address: defaultClientHexAddress,
        response_status: 200,
        egress_bytes: expectedEgressBytes,
        cache_miss: 0, // 1 for true, 0 for false
      },
    ])
  })
  it('stores retrieval performance stats in D1', async () => {
    const body = 'file content'
    const fakeResponse = new Response(body, {
      status: 200,
      headers: {
        'CF-Cache-Status': 'MISS',
      },
    })
    const mockRetrieveFile = async () => {
      await sleep(1) // Simulate a delay
      return {
        response: fakeResponse,
        cacheMiss: true,
      }
    }
    const req = withRequest(defaultClientBase32Address, realBlobId)
    const res = await worker.fetch(req, env, { retrieveFile: mockRetrieveFile })
    assert.strictEqual(res.status, 200)
    const readOutput = await env.DB.prepare(
      `SELECT
        response_status,
        fetch_ttfb,
        fetch_ttlb,
        worker_ttfb,
        client_address
       FROM retrieval_logs
       WHERE client_address = ?`,
    )
      .bind(defaultClientHexAddress)
      .all()
    assert.strictEqual(readOutput.results.length, 1)
    const result = readOutput.results[0]

    assert.deepStrictEqual(result.client_address, defaultClientHexAddress)
    assert.strictEqual(result.response_status, 200)
    assert.strictEqual(typeof result.fetch_ttfb, 'number')
    assert.strictEqual(typeof result.fetch_ttlb, 'number')
    assert.strictEqual(typeof result.worker_ttfb, 'number')
  })
  it('stores request country code in D1', async () => {
    const body = 'file content'
    const mockRetrieveFile = async () => {
      return {
        response: new Response(body, {
          status: 200,
        }),
        cacheMiss: true,
      }
    }
    const req = withRequest(defaultClientBase32Address, realBlobId, 'GET', {
      'CF-IPCountry': 'US',
    })
    const res = await worker.fetch(req, env, { retrieveFile: mockRetrieveFile })
    assert.strictEqual(res.status, 200)
    const { results } = await env.DB.prepare(
      `SELECT request_country_code
       FROM retrieval_logs
       WHERE client_address = ?`,
    )
      .bind(defaultClientHexAddress)
      .all()
    assert.deepStrictEqual(results, [
      {
        request_country_code: 'US',
      },
    ])
  })
  it('logs 0 egress bytes for empty body', async () => {
    const fakeResponse = new Response(null, {
      status: 200,
      headers: {
        'CF-Cache-Status': 'MISS',
      },
    })
    const mockRetrieveFile = vi.fn().mockResolvedValue({
      response: fakeResponse,
      cacheMiss: true,
    })
    const req = withRequest(defaultClientBase32Address, realBlobId)
    const res = await worker.fetch(req, env, { retrieveFile: mockRetrieveFile })
    assert.strictEqual(res.status, 200)
    const readOutput = await env.DB.prepare(
      'SELECT egress_bytes FROM retrieval_logs WHERE client_address = ?',
    )
      .bind(defaultClientHexAddress)
      .all()
    assert.strictEqual(readOutput.results.length, 1)
    assert.strictEqual(readOutput.results[0].egress_bytes, 0)
  })

  it(
    'measures egress correctly from real aggregator',
    { timeout: 10000 },
    async () => {
      const req = withRequest(defaultClientBase32Address, realBlobId)
      console.log({ msg: 'real', url: req.url })
      const res = await worker.fetch(req, env, {
        getAggregator: () => realAggregatorUrl,
      })

      assert.strictEqual(res.status, 200)

      const content = await res.arrayBuffer()
      const actualBytes = content.byteLength

      const { results } = await env.DB.prepare(
        'SELECT egress_bytes FROM retrieval_logs WHERE client_address = ? AND aggregator_url = ?',
      )
        .bind(defaultClientHexAddress, realAggregatorUrl)
        .all()

      assert.strictEqual(results.length, 1)
      assert.strictEqual(results[0].egress_bytes, actualBytes)
    },
  )

  it('matches retrieval URL for aggregator url case-insensitively', async () => {
    const body = 'file content'
    // Simulate file retrieval
    const mockRetrieveFile = async (url, blobId) => {
      // Check that the aggregatorUrl matches (case-insensitive)
      assert.strictEqual(url.toLowerCase(), aggregatorUrl.toLowerCase())
      assert.strictEqual(blobId, realBlobId)
      return {
        response: new Response(body, {
          status: 200,
        }),
        cacheMiss: true,
      }
    }

    const req = withRequest(defaultClientBase32Address, realBlobId, 'GET')
    const res = await worker.fetch(req, env, {
      retrieveFile: mockRetrieveFile,
    })

    assert.strictEqual(res.status, 200)
  })
})

/**
 * @param {string} clientWalletAddress
 * @param {string} rootCid
 * @param {string} method
 * @param {Object} headers
 * @returns {Request}
 */
function withRequest(
  clientWalletAddress,
  rootCid,
  method = 'GET',
  headers = {},
) {
  let url = 'http://'
  if (clientWalletAddress) url += `${clientWalletAddress}.`
  url += DNS_ROOT.slice(1) // remove the trailing '.'
  if (rootCid) url += `/${rootCid}`

  return new Request(url, { method, headers })
}
