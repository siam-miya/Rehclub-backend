
import { toNodeHandler } from "better-auth/node";

import { getAuth } from "../../config/auth.js";

export const authHandler = (req, res, next) => {
  return toNodeHandler(getAuth())(req, res, next);
};
