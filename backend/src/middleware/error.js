export function errorHandler(error, _req, res, _next) {
  const status = error.status || (error.code === 11000 ? 409 : 500);
  const message = error.code === 11000 ? "That username or Connectify ID is already in use" : error.message || "Something went wrong";
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message });
}
