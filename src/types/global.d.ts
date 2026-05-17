declare module "*.css";

declare module "rate-limiter-flexible/lib/RateLimiterMemory" {
  import { RateLimiterMemory } from "rate-limiter-flexible";
  export default RateLimiterMemory;
}

declare module "rate-limiter-flexible/lib/RateLimiterRedis" {
  import { RateLimiterRedis } from "rate-limiter-flexible";
  export default RateLimiterRedis;
}
