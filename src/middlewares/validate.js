
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.flatten().fieldErrors,
    });
  }

  if (result.data.body !== undefined) {
    req.body = result.data.body;
  }

  if (result.data.params !== undefined) {
    req.params = result.data.params;
  }

  res.locals.validatedQuery = result.data.query;

  next();
};
