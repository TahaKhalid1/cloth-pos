const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "cloth-pos-dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

function sanitizeUser(userRow) {
  return {
    id: userRow.id,
    username: userRow.username,
    full_name: userRow.full_name,
    role: userRow.role
  };
}

function createAuthHelpers(db) {
  const getUserByIdStatement = db.prepare(`
    SELECT id, username, full_name, role, password_hash, is_active
    FROM users
    WHERE id = ?
  `);

  const getUserByUsernameStatement = db.prepare(`
    SELECT id, username, full_name, role, password_hash, is_active
    FROM users
    WHERE LOWER(username) = LOWER(?)
  `);

  function getUserById(id) {
    return getUserByIdStatement.get(id);
  }

  function getUserByUsername(username) {
    return getUserByUsernameStatement.get(username);
  }

  function signAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  function authenticateRequest(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    let payload;

    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (_error) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: "Invalid authentication payload." });
    }

    const user = getUserById(userId);

    if (!user || user.is_active !== 1) {
      return res.status(401).json({ error: "User account is unavailable." });
    }

    req.user = sanitizeUser(user);
    return next();
  }

  function authorizeRoles(...roles) {
    const allowedRoles = new Set(roles);

    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required." });
      }

      if (!allowedRoles.has(req.user.role)) {
        return res
          .status(403)
          .json({ error: "Forbidden: insufficient permissions." });
      }

      return next();
    };
  }

  return {
    JWT_EXPIRES_IN,
    sanitizeUser,
    getUserById,
    getUserByUsername,
    signAccessToken,
    authenticateRequest,
    authorizeRoles
  };
}

module.exports = {
  createAuthHelpers
};
