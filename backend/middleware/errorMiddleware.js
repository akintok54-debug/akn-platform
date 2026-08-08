const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Endpoint bulunamadi: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Bilinmeyen sunucu hatasi",
  });
};

module.exports = { notFound, errorHandler };
