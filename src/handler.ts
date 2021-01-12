import 'make-promises-safe';
import 'source-map-support/register';
import { 
  APIGatewayProxyHandler, 
  APIGatewayProxyEvent, 
  APIGatewayProxyResult,
} from 'aws-lambda';
import { stringify } from 'querystring';
import Redis from 'ioredis';
// Target namespace (instant-tunnel)
const NAMESPACE: string = process.env.NAMESPACE || 'instant-tunnel';
// Throw if no namespace is defined
if (!NAMESPACE) {
  throw new Error('Redis NAMESPACE required before use');
}
// Initialize redis client
const client: Redis.Redis = new Redis(Object.freeze({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || '',
}) as Redis.RedisOptions);
// queryAll: GET - Query for names associated
export const queryAll: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Ensure query param is found
  if (!event.queryStringParameters || !event.queryStringParameters.query) {
    return Object.freeze({
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid parameters provided. Requires query parameter'
      })
    })
  }
  const query: string = event.queryStringParameters.query;
  const encodedParams: string | undefined = event.queryStringParameters.params; // not necessary if redirect is not enabled
  const redirect: string | undefined = event.queryStringParameters.redirect;
  // Should request automatically redirect (default: yes)
  let shouldRedirect = true;
  if (redirect) {
    shouldRedirect = redirect === 'true' || redirect === 'yes';
  }
  // If params is encoded base64, begin to parse
  let decodedParams: string | undefined;
  if (encodedParams) {
    const decodedB64: string = Buffer.from(encodedParams, 'base64').toString('utf-8');
    let paramsObj: Record<string, unknown> = {}; // Shape is unknown, expected as JSON object
    try {
      paramsObj = JSON.parse(decodedB64);
    } catch (err) {
      // Log error and return invalid json response
      console.error(err);
      return Object.freeze({
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid JSON encountered. params requires base64 encoded JSON object'
        })
      });
    }
    // Form querystring
    decodedParams = stringify(paramsObj);
  }
  // Begin scanning according to query (somewhat expensive call)
  const scanResults: [string, Array<string>] = await client.sscan(`${NAMESPACE}:tunnels`, '0', 'MATCH', `${query}*`);
  // If no result is found, return 404
  if (!scanResults[1].length) {
    return Object.freeze({
      statusCode: 404,
      body: JSON.stringify({
        message: `Query (${query}) was not found`
      })
    });
  }
  // Get first result
  const result: string = scanResults[1][0];
  // Retrieve public proxy url
  const proxyUrl: string = await client.hget(`${NAMESPACE}:tunnels_${result}`, 'public_url');
  // If somehow the proxy isn't found directly, return 404
  if (!proxyUrl) {
    return Object.freeze({
      statusCode: 404,
      body: JSON.stringify({
        message: `Query (${query}) was not found`
      })
    });
  }
  // Return direct link or redirect based on query params
  return Object.freeze(shouldRedirect ? {
    statusCode: 302,
    headers: {
      'Location': decodedParams ? `${proxyUrl}?${decodedParams}` : proxyUrl,
      'Access-Control-Allow-Origin': '*'
    },
    body: null
  } : {
    statusCode: 200,
    body: JSON.stringify({
      proxyUrl
    }, null, 2)
  });
}