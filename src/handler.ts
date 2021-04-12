import 'make-promises-safe';
import 'source-map-support/register';
import { 
  APIGatewayProxyHandler, 
  APIGatewayProxyEvent, 
  APIGatewayProxyResult,
} from 'aws-lambda';
import * as Knex from 'knex';
import isUrlHttp from 'is-url-http';
import { stringify } from 'querystring';
import { 
  QUERY_TABLE_NAME,
  QueryResult 
} from './constants';
// Throw if none of the env values were found
const HOST = process.env.DB_HOST || 'localhost';
if (!HOST) {
  throw new Error('Postgresql DB_HOST required before use');
}
const USER = process.env.DB_USER;
if (!USER) {
  throw new Error('Postgresql DB_USER required before use');
}
const PASS = process.env.DB_PASS;
if (!PASS) {
  throw new Error('Postgresql DB_PASS required before use');
}
// Initialize knex client
const db: Knex = Knex(Object.freeze({
  client: 'pg',
  connection: {
    host: HOST,
    user: USER,
    password: PASS,
    database: 'instant_tunnel'
  },
  pool: {
    min: 1,
    max: 1,
  }
}) as Knex.Config);
// queryAll: GET - Query for names associated
export const queryAll: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Ensure query param is found
  if (!event.queryStringParameters || !event.queryStringParameters.query) {
    return Object.freeze({
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
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
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid JSON encountered. params requires base64 encoded JSON object'
        })
      });
    }
    // Form querystring
    decodedParams = stringify(paramsObj);
  }
  // Find first result matching query terms
  const queryResult: QueryResult = await db.first<QueryResult>('proxy').where('name', 'like', `%${query}%`).from(QUERY_TABLE_NAME);
  // If no result is found, return 404
  if (!queryResult) {
    return Object.freeze({
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      statusCode: 404,
      body: JSON.stringify({
        message: `Query (${query}) was not found`
      })
    });    
  }
  // Retrieve proxy url, if name is found but proxy is null it's currently inactive
  // TODO: Render a maintenance page
  const proxyUrl: string = queryResult.proxy;
  if (!proxyUrl || !proxyUrl.length) {
    return Object.freeze({
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      statusCode: 503,
      body: JSON.stringify({
        message: 'Service is undergoing maintenance'
      })
    });
  }
  // If the proxy is incorrectly formed or invalid, return 500
  if (!isUrlHttp(proxyUrl)) {
    return Object.freeze({
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to parse proxy url'
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
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      proxyUrl
    }, null, 2)
  });
}
