import {
  ExecutionContext,
  FormatPayloadParams,
  getGraphQLParameters,
  processRequest,
  Request,
} from "graphql-helix";

import {
  Context,
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
} from "aws-lambda";
import { GraphQLSchema } from "graphql";

type HandlerConfig<C> = {
  formatPayload?: (params: FormatPayloadParams<C, any>) => any;
  context?: (request: {
    event: APIGatewayProxyEventV2;
    context: Context;
    execution: ExecutionContext;
  }) => Promise<C>;
} & { schema: GraphQLSchema };

export function createGQLHandler<T>(config: HandlerConfig<T>) {
  const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    const request: Request = {
      body: event.body ? JSON.parse(event.body) : undefined,
      query: event.queryStringParameters,
      method: event.requestContext.http.method,
      headers: event.headers,
    };

    const { operationName, query, variables } = getGraphQLParameters(request);

    // Validate and execute the query
    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema: config.schema,
      formatPayload: config.formatPayload as any,
      contextFactory: async (execution) => {
        if (config.context) {
          return config.context({
            event: event,
            context,
            execution,
          });
        }
        return undefined;
      },
    });
    if (result.type === "RESPONSE") {
      return {
        statusCode: result.status,
        body: JSON.stringify(result.payload),
        headers: Object.fromEntries(
          result.headers.map((h) => [h.name, h.value])
        ),
      };
    }
    return {
      statusCode: 500,
    };
  };

  return handler;
}
