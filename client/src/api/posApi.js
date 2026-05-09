import http from "./http";

export async function login(payload) {
  const { data } = await http.post("/auth/login", payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await http.get("/auth/me");
  return data;
}

export async function logout() {
  await http.post("/auth/logout");
}

export async function getCategories() {
  const { data } = await http.get("/categories");
  return data;
}

export async function getColors() {
  const { data } = await http.get("/colors");
  return data;
}

export async function getProducts(filters = {}) {
  const { data } = await http.get("/products", { params: filters });
  return data;
}

export async function getProductById(id) {
  const { data } = await http.get(`/products/${id}`);
  return data;
}

export async function createProduct(payload) {
  const { data } = await http.post("/products", payload);
  return data;
}

export async function updateProduct(id, payload) {
  const { data } = await http.put(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  await http.delete(`/products/${id}`);
}

export async function getCustomers() {
  const { data } = await http.get("/customers");
  return data;
}

export async function createCustomer(payload) {
  const { data } = await http.post("/customers", payload);
  return data;
}

export async function updateCustomer(id, payload) {
  const { data } = await http.put(`/customers/${id}`, payload);
  return data;
}

export async function createSale(payload) {
  const { data } = await http.post("/sales", payload);
  return data;
}

export async function getSales(params = {}) {
  const { data } = await http.get("/sales", { params });
  return data;
}

export async function getSaleById(id) {
  const { data } = await http.get(`/sales/${id}`);
  return data;
}

export async function getDashboard() {
  const { data } = await http.get("/dashboard");
  return data;
}
