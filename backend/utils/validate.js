export const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.validated = result;
    next();
  } catch (err) {
    const e = new Error('Validation error');
    e.statusCode = 400;
    const details =
      err?.issues?.map((i) => ({
        path: i.path?.join('.') || '',
        message: i.message,
      })) || [];
    e.details = details;
    if (details.length) e.message = `Validation error: ${details[0].message}`;
    next(e);
  }
};

