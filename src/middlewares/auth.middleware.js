
import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "../config/auth.js";

// Required authentication
export const authenticate = async (req, res, next) => {
  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    req.user = session.user;
    req.session = session.session;

    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication (Guest + Logged-in customer)
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session?.user) {
      req.user = session.user;
      req.session = session.session;
    }

    next();
  } catch (error) {
    next(error);
  }
};
