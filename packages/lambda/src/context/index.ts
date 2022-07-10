import { APIGatewayProxyEventV2, SQSEvent } from "aws-lambda";

const map = new Map();

type Context = () => any;

export function createContext<C extends Context>(cb: C) {
  return {
    use() {
      let result = map.get(cb);
      if (!result) {
        result = cb();
        map.set(cb, result);
      }
      return result as ReturnType<C>;
    },
    provide(value: ReturnType<C>) {
      map.set(cb, value);
    },
  };
}

const EventContext = createContext((): APIGatewayProxyEventV2 | SQSEvent => {
  throw new Error("Cannot determine event. Please provide it.");
});

const SessionContext = createContext(() => {
  const event = EventContext.use();
  if ("requestContext" in event) {
    const { authorization } = event.headers;
    if (!authorization)
      throw new Error("Authorization header is missing. Please provide it.");

    // jwt decode
    return { type: "user", userID: "user-id" };
  }

  throw new Error("Cannot determine session. Please provide it.");
});
