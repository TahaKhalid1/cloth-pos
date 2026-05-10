const PRODUCT_IMAGE_BY_SKU = {
  "CLTH-0001": "/product-photos/CLTH-0001.webp",
  "CLTH-0002": "/product-photos/CLTH-0002.webp",
  "CLTH-0003": "/product-photos/CLTH-0003.webp",
  "CLTH-0004": "/product-photos/CLTH-0004.webp",
  "CLTH-0005": "/product-photos/CLTH-0005.jpeg",
  "CLTH-0006": "/product-photos/CLTH-0006.jpeg",
  "CLTH-0007": "/product-photos/CLTH-0007.jpeg",
  "CLTH-0008": "/product-photos/CLTH-0008.png",
  "CLTH-0009": "/product-photos/CLTH-0009.webp",
  "CLTH-0010": "/product-photos/CLTH-0010.webp",
  "CLTH-0011": "/product-photos/CLTH-0011.webp",
  "CLTH-0012": "/product-photos/CLTH-0012.webp",
  "CLTH-0013": "/product-photos/CLTH-0013.png",
  "CLTH-0014": "/product-photos/CLTH-0014.png",
  "CLTH-0015": "/product-photos/CLTH-0015.png",
  "CLTH-0016": "/product-photos/CLTH-0016.png",
  "CLTH-0017": "/product-photos/CLTH-0017.webp",
  "CLTH-0018": "/product-photos/CLTH-0018.png",
  "CLTH-0019": "/product-photos/CLTH-0019.webp",
  "CLTH-0020": "/product-photos/CLTH-0020.png",
  "CLTH-0021": "/product-photos/CLTH-0021.jpeg",
  "CLTH-0022": "/product-photos/CLTH-0022.webp",
  "CLTH-0023": "/product-photos/CLTH-0023.jpeg",
  "CLTH-0024": "/product-photos/CLTH-0024.webp"
};

const FALLBACK_IMAGE = "/product-photos/fallback.webp";

function normalizeSku(sku) {
  return String(sku || "").trim().toUpperCase();
}

export function getProductImage(product) {
  const sku = normalizeSku(product?.sku);
  return PRODUCT_IMAGE_BY_SKU[sku] || FALLBACK_IMAGE;
}

export function getFallbackProductImage() {
  return FALLBACK_IMAGE;
}
