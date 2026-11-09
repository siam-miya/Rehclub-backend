
export const validate = (schema) => (req, res, next) => {
  const input = {};

  // Only validate sections defined in the schema
  if (schema.shape.body) {
    input.body = req.body;
  }

  if (schema.shape.params) {
    input.params = req.params;
  }

  if (schema.shape.query) {
    input.query = req.query;
  }

  const result = schema.safeParse(input);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: {
        ...result.error.flatten().fieldErrors,
        formErrors: result.error.flatten().formErrors,
      },
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
