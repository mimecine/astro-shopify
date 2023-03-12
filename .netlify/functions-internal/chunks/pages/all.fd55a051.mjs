import { c as createAstro, a as createComponent, r as renderTemplate, m as maybeRenderHead, b as renderComponent, d as addAttribute, e as renderHead, f as renderSlot } from '../astro.e7f1e798.mjs';
import 'html-escaper';
import { z } from 'zod';
import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
/* empty css                         */
const configSchema = z.object({
  shopifyShop: z.string(),
  publicShopifyAccessToken: z.string(),
  privateShopifyAccessToken: z.string(),
  apiVersion: z.string()
});
const MoneyV2Result = z.object({
  amount: z.string(),
  currencyCode: z.string()
});
const ImageResult = z.object({
  altText: z.string().nullable().optional(),
  url: z.string(),
  width: z.number().positive().int(),
  height: z.number().positive().int()
}).nullable();
const CartItemResult = z.object({
  id: z.string(),
  cost: z.object({
    amountPerQuantity: MoneyV2Result,
    subtotalAmount: MoneyV2Result,
    totalAmount: MoneyV2Result
  }),
  merchandise: z.object({
    id: z.string(),
    title: z.string(),
    product: z.object({
      title: z.string(),
      handle: z.string()
    }),
    image: ImageResult.nullable()
  }),
  quantity: z.number().positive().int()
});
z.object({
  id: z.string(),
  cost: z.object({
    totalAmount: MoneyV2Result
  }),
  checkoutUrl: z.string(),
  totalQuantity: z.number().int(),
  lines: z.object({
    nodes: z.array(CartItemResult)
  })
}).nullable();
const VariantResult = z.object({
  id: z.string(),
  title: z.string(),
  availableForSale: z.boolean(),
  quantityAvailable: z.number().int(),
  priceV2: MoneyV2Result
});
const ProductResult = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  images: z.object({
    nodes: z.array(ImageResult)
  }),
  variants: z.object({
    nodes: z.array(VariantResult)
  }),
  featuredImage: ImageResult.nullable()
}).nullable();

const defineConfig = {
  shopifyShop: "kioskinkiosk.myshopify.com",
  publicShopifyAccessToken: Object.assign({"PUBLIC_SHOPIFY_SHOP":"kioskinkiosk.myshopify.com","PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN":"7766fe447c722c1317e528bdc92f1f2d","BASE_URL":"/","MODE":"production","DEV":false,"PROD":true,"SSR":true,"SITE":undefined}, { PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN: "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", _: process.env._ }).PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
  privateShopifyAccessToken: Object.assign({"PUBLIC_SHOPIFY_SHOP":"kioskinkiosk.myshopify.com","PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN":"7766fe447c722c1317e528bdc92f1f2d","BASE_URL":"/","MODE":"production","DEV":false,"PROD":true,"SSR":true,"SITE":undefined}, { PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN: "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", _: process.env._ }).PRIVATE_SHOPIFY_STOREFRONT_ACCESS_TOKEN ? "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" : "",
  apiVersion: "2023-01"
};
const config = configSchema.parse(defineConfig);

const PRODUCT_FRAGMENT = `
fragment productFragment on Product {
  id
  title
  handle
  images (first: 10) {
    nodes {
      url(transform: {preferredContentType: WEBP})
      width
      height
      altText
    }
  }
  variants(first: 10) {
    nodes {
      id
      title
      availableForSale
      quantityAvailable
      priceV2 {
        amount
        currencyCode
      }
    }
  }
  featuredImage {
    url(transform: {preferredContentType: WEBP})
    width
    height
    altText
  }
}
`;
const ProductsQuery = `
query ($first: Int!) {
    products(first: $first) {
      edges {
        node {
          ...productFragment
        }
      }
    }
  }
  ${PRODUCT_FRAGMENT}
`;
const ProductByHandleQuery = `
  query ($handle: String!) {
    productByHandle(handle: $handle) {
      ...productFragment
    }
  }
  ${PRODUCT_FRAGMENT}
`;
const ProductRecommendationsQuery = `
  query ($productId: ID!) {
    productRecommendations(productId: $productId) {
      ...productFragment
    }
  }
  ${PRODUCT_FRAGMENT}
`;

const makeShopifyRequest = async (query, variables = {}, buyerIP = "") => {
  const apiUrl = `https://${config.shopifyShop}/api/${config.apiVersion}/graphql.json`;
  function getOptions() {
    !buyerIP && console.error(
      `🔴 No buyer IP provided => make sure to pass the buyer IP when making a server side Shopify request.`
    );
    const { privateShopifyAccessToken, publicShopifyAccessToken } = config;
    const options = {
      method: "POST",
      headers: {},
      body: JSON.stringify({ query, variables })
    };
    {
      options.headers = {
        "Content-Type": "application/json",
        "Shopify-Storefront-Private-Token": privateShopifyAccessToken,
        "Shopify-Storefront-Buyer-IP": buyerIP
      };
      return options;
    }
  }
  const response = await fetch(apiUrl, getOptions());
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${body}`);
  }
  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join("\n"));
  }
  return json.data;
};
const getProducts = async (options) => {
  const { limit = 10, buyerIP } = options;
  const data = await makeShopifyRequest(
    ProductsQuery,
    { first: limit },
    buyerIP
  );
  const { products } = data;
  if (!products) {
    throw new Error("No products found");
  }
  const productsList = products.edges.map((edge) => edge.node);
  const ProductsResult = z.array(ProductResult);
  const parsedProducts = ProductsResult.parse(productsList);
  return parsedProducts;
};
const getProductByHandle = async (options) => {
  const { handle, buyerIP } = options;
  const data = await makeShopifyRequest(
    ProductByHandleQuery,
    { handle },
    buyerIP
  );
  const { productByHandle } = data;
  const parsedProduct = ProductResult.parse(productByHandle);
  return parsedProduct;
};
const getProductRecommendations = async (options) => {
  const { productId, buyerIP } = options;
  const data = await makeShopifyRequest(
    ProductRecommendationsQuery,
    {
      productId
    },
    buyerIP
  );
  const { productRecommendations } = data;
  const ProductsResult = z.array(ProductResult);
  const parsedProducts = ProductsResult.parse(productRecommendations);
  return parsedProducts;
};

const $$Astro$g = createAstro();
const $$Logo = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$g, $$props, $$slots);
  Astro2.self = $$Logo;
  return renderTemplate`${maybeRenderHead($$result)}<svg class="group h-auto w-16 sm:w-28" viewBox="0 0 3039 1299" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="astro-shopify">
    <g id="shopify">
      <path id="Vector" d="M2850.08 217.105C2849.27 212.183 2845.25 208.409 2840.28 207.94C2836.36 207.296 2750.37 201.401 2750.37 201.401L2684.8 135.838C2678.89 129.299 2665.81 131.212 2660.87 132.569C2660.23 132.569 2647.8 136.482 2627.45 143.09C2607.68 85.8749 2572.67 33.4248 2511 33.4248H2505.73C2488.06 10.5213 2466.43 0 2448.17 0C2304.59 0.643453 2236.18 179.697 2214.54 271.189L2114.2 301.971C2083.42 311.779 2082.29 312.492 2078.15 341.848L1993.51 994.309L2627.71 1113L2971.4 1038.92C2971.4 1038.27 2850.71 223.33 2850.08 217.105ZM2592.29 154.081C2576.34 159.35 2558.15 164.602 2538.55 170.515V158.689C2539.13 129.18 2534.71 99.7861 2525.47 71.7537C2557.61 76.6927 2579.21 112.743 2592.3 154.064L2592.29 154.081ZM2486.76 79.336C2497.25 110.257 2502.12 142.812 2501.12 175.454V181.367L2390.26 215.505C2411.96 134.464 2451.98 94.4311 2486.76 79.336ZM2444.15 39.4593C2450.71 39.5989 2457.09 41.6476 2462.5 45.3548C2416.24 66.8843 2367.34 121.282 2346.37 230.165L2258.63 257.051C2283.38 174.428 2341.11 39.3028 2444.1 39.3028L2444.15 39.4593Z" fill="#95BF47"></path>
      <path id="Vector_2" d="M2840.28 207.94C2836.36 207.296 2750.37 201.401 2750.37 201.401L2684.81 135.838C2682.37 133.369 2679.07 131.96 2675.64 131.925L2627.78 1113L2971.47 1038.92L2850.09 217.765C2849.69 215.306 2848.53 213.033 2846.77 211.272C2845.01 209.511 2842.74 208.351 2840.28 207.957V207.94Z" fill="#5E8E3E"></path>
      <path id="Vector_3" d="M2511.02 398.071L2468.34 524.014C2442.55 511.528 2414.36 504.815 2385.7 504.311C2318.79 504.311 2315.52 546.257 2315.52 556.796C2315.52 614.15 2465.7 636.166 2465.7 771.274C2465.7 877.531 2398.14 945.702 2307.45 945.702C2198.58 945.702 2142.81 878.14 2142.81 878.14L2171.77 781.622C2171.77 781.622 2228.81 830.837 2277.38 830.837C2283.18 831.059 2288.98 830.1 2294.4 828.018C2299.83 825.937 2304.77 822.777 2308.94 818.729C2313.11 814.68 2316.41 809.829 2318.65 804.467C2320.89 799.105 2322.02 793.345 2321.97 787.534C2321.97 712.059 2198.67 708.807 2198.67 585.49C2198.67 481.807 2273.41 380.803 2423.6 380.803C2482.62 381.672 2510.86 398.019 2510.86 398.019L2511.02 398.071Z" fill="white"></path>
    </g>
    <g id="emoji" class="group-hover:animate-shake">
      <path id="Vector_4" d="M1582.97 612.772C1582.81 609.366 1582.63 605.706 1582.39 601.766C1578.66 537.639 1565.87 408.928 1567.15 391.7C1568.5 373.438 1577.1 359.181 1602.88 356.666C1628.67 354.15 1643.6 377.142 1643.73 410.058C1643.85 442.974 1662.14 564.283 1668.07 605.134C1677.25 668.422 1697.04 766.01 1697.04 766.01L1595 709.768L1582.97 612.772Z" fill="url(#paint0_linear_1_17)"></path>
      <path id="Vector_5" d="M1668.07 605.16C1662.14 564.281 1643.85 443 1643.73 410.084C1643.66 388.68 1637.23 371.625 1625.7 362.902C1637.44 390.42 1637.83 432.89 1651.28 544.488C1668 683.567 1683.97 729.181 1683.97 729.181L1688.71 723.677C1682.21 689.609 1673.37 641.711 1668.07 605.16Z" fill="url(#paint1_linear_1_17)"></path>
      <path id="Vector_6" d="M1586.91 503.485C1578.73 437.905 1572.12 392.757 1578.62 365.817C1571.23 372.203 1567.94 381.244 1567.18 391.695C1565.9 408.923 1578.68 537.606 1582.42 601.761C1582.65 605.673 1582.84 609.361 1582.99 612.767L1587.21 646.686L1595.17 657.463C1595.14 657.438 1597.91 591.8 1586.91 503.485Z" fill="url(#paint2_linear_1_17)"></path>
      <path id="Vector_7" d="M1320.6 473.834C1284.91 484.489 1294.41 520.349 1304.78 554.329C1315.91 590.717 1350.28 729.548 1350.28 729.548L1435.81 726.63C1435.81 726.63 1436.79 713.735 1431.82 695.912C1417.13 643.218 1383.4 535.829 1371.48 502.71C1355.92 459.394 1320.6 473.834 1320.6 473.834Z" fill="url(#paint3_linear_1_17)"></path>
      <path id="Vector_8" d="M1431.82 695.91C1417.13 643.217 1383.4 535.827 1371.48 502.709C1362.91 478.904 1348.42 472.576 1337.07 471.674C1367.46 490.638 1390.23 600.454 1410.22 646.307C1427.06 684.966 1432.58 701.083 1434.19 706.344C1433.6 703.123 1432.87 699.658 1431.82 695.91Z" fill="url(#paint4_linear_1_17)"></path>
      <path id="Vector_9" d="M1340.9 770.053C1342.89 790.645 1353.75 798.92 1359.04 801.773C1360.81 802.714 1361.96 803.06 1361.96 803.06L1461.48 862.14L1628.26 810.447L1612.56 702.003C1519.58 698.939 1438.47 661.632 1342.43 662.969C1335.29 698.524 1338.59 746.044 1340.9 770.053Z" fill="url(#paint5_linear_1_17)"></path>
      <path id="Vector_10" d="M1522.44 755.794C1563.93 747.288 1593.85 779.439 1598.93 797.167L1612.14 790.818L1599.24 722.101L1552.04 697.403L1508.96 643.799L1427.97 661.902L1412.97 626.629C1412.66 626.659 1413.28 626.599 1412.97 626.629C1412.97 626.629 1413.43 718.098 1459.46 725.006C1459.46 725.006 1488.11 762.839 1522.44 755.794Z" fill="url(#paint6_linear_1_17)"></path>
      <path id="Vector_11" d="M1477.75 715.43C1447.55 718.342 1431.33 707.99 1423.88 674.783C1416.43 641.576 1392.42 582.711 1447.56 574.144C1500.39 565.912 1504.23 595.077 1508.93 643.83C1513.63 692.555 1503.74 712.924 1477.75 715.43Z" fill="url(#paint7_linear_1_17)"></path>
      <path id="Vector_12" d="M1468.76 663.899C1446.84 677.873 1431.36 679.622 1419.93 664.532C1420.33 666.318 1420.76 668.101 1421.09 669.78C1428.96 707.622 1445.36 719.581 1475.56 716.669C1496.8 714.621 1507.11 698.887 1507.25 663.01C1500.32 653.215 1481.71 655.666 1468.76 663.899Z" fill="url(#paint8_linear_1_17)"></path>
      <path id="Vector_13" d="M1469.95 678.3C1445.18 680.689 1432.75 668.574 1425.96 641.889C1422.47 628.171 1403.69 580.947 1448.91 573.934C1492.25 567.217 1495.39 599.443 1498.93 626.755C1504 666.035 1491.28 676.243 1469.95 678.3Z" fill="url(#paint9_linear_1_17)"></path>
      <path id="Vector_14" d="M1459.53 715.16C1464.97 715.947 1470.94 716.084 1477.75 715.427C1503.73 712.921 1513.63 692.581 1508.93 643.828C1504.4 596.826 1500.55 568.147 1452.97 573.505C1472.66 581.67 1490.15 602.818 1494.1 643.775C1499.69 701.993 1485.9 712.503 1459.53 715.16Z" fill="url(#paint10_linear_1_17)"></path>
      <path id="Vector_15" d="M1463.57 716.769C1458.61 718.844 1453.7 717.037 1449.22 715.216C1444.7 713.314 1440.53 710.552 1437.01 707.129C1429.9 700.259 1425.7 691.257 1422.78 682.245C1419.93 673.083 1418.94 663.714 1417.3 654.463L1412.94 626.632L1419.04 654.125C1421.09 663.278 1422.62 672.596 1425.73 681.275C1428.65 689.974 1432.81 698.468 1439.39 704.647C1442.66 707.753 1446.46 710.209 1450.58 711.892C1454.8 713.68 1459.18 713.857 1463.57 716.769Z" fill="#975500"></path>
      <path id="Vector_16" d="M1472.76 573.508C1478.03 574.34 1483.29 576.027 1487.81 579.127C1492.36 582.223 1495.78 586.711 1498.38 591.478C1503.67 601.088 1505.88 611.88 1507.81 622.441C1509.35 633.098 1510.41 643.772 1511.21 654.471C1511.64 659.761 1512.27 665.117 1512.53 670.508C1512.59 673.211 1512.85 675.922 1512.49 678.666C1512.24 681.056 1511.43 685.125 1508.19 685.21C1510.76 684.022 1510.37 680.951 1510.74 678.521C1510.8 675.921 1510.83 673.266 1510.58 670.64C1510.15 665.349 1509.33 660.069 1508.7 654.713C1507.39 644.092 1506.48 633.432 1504.75 622.908C1503.17 612.455 1501.43 601.789 1496.7 592.353C1492.35 582.737 1483.3 575.77 1472.76 573.508Z" fill="#975500"></path>
      <path id="Vector_17" d="M1522.44 755.791C1488.11 762.837 1459.45 724.975 1459.45 724.975C1425.2 718.956 1412.96 626.599 1412.96 626.599C1406.8 640.763 1426.63 716.566 1445.76 732.226C1466.49 749.213 1490.79 771.131 1528.47 766.641C1566.16 762.152 1598.92 797.165 1598.92 797.165C1593.85 779.437 1563.92 747.286 1522.44 755.791Z" fill="url(#paint11_linear_1_17)"></path>
      <path id="Vector_18" opacity="0.75" d="M1314.18 521.41C1305.54 520.419 1307.07 503.195 1313.42 494.001C1319.8 484.804 1331.99 478.183 1340.64 479.174C1349.29 480.164 1347.02 490.875 1345.13 500.293C1341.91 516.541 1322.83 522.4 1314.18 521.41Z" fill="url(#paint12_radial_1_17)"></path>
      <path id="Vector_19" opacity="0.75" d="M1589.32 369.176C1591.24 360.694 1608.22 364.075 1616.65 371.415C1625.09 378.755 1630.34 391.59 1628.43 400.1C1626.51 408.581 1616.09 405.167 1606.94 402.257C1591.15 397.252 1587.4 377.657 1589.32 369.176Z" fill="url(#paint13_radial_1_17)"></path>
      <g id="Group">
        <path id="Vector_20" d="M1562.16 693.244C1534.22 695.026 1519.51 684.357 1513.5 651.61C1507.49 618.862 1486.81 560.504 1537.9 554.037C1586.85 547.833 1589.67 576.469 1592.77 624.322C1595.85 672.148 1586.21 691.694 1562.16 693.244Z" fill="url(#paint14_linear_1_17)"></path>
        <path id="Vector_21" d="M1555.15 641.916C1534.55 654.737 1520.24 655.889 1510.09 640.846C1510.43 642.581 1510.77 644.344 1511.05 645.999C1517.35 682.995 1532.15 695.166 1560.09 693.384C1579.72 692.117 1589.66 677.218 1590.72 642.364C1584.54 632.64 1567.28 634.361 1555.15 641.916Z" fill="url(#paint15_linear_1_17)"></path>
        <path id="Vector_22" d="M1553.42 644.851C1530.49 646.32 1521.81 645.219 1516.21 619.103C1513.32 605.67 1497.23 559.184 1539.15 553.944C1579.31 548.901 1581.37 580.319 1583.94 606.926C1587.63 645.2 1573.16 643.573 1553.42 644.851Z" fill="url(#paint16_linear_1_17)"></path>
        <path id="Vector_23" d="M1545.39 692.318C1550.39 693.29 1555.89 693.615 1562.18 693.208C1586.24 691.657 1595.87 672.14 1592.77 624.288C1589.78 578.193 1586.94 550.014 1542.9 553.578C1560.87 562.25 1576.47 583.553 1579.06 623.701C1582.77 680.873 1569.78 690.651 1545.39 692.318Z" fill="url(#paint17_linear_1_17)"></path>
        <path id="Vector_24" d="M1548.97 693.094C1544.08 695.019 1539.41 692.933 1535.19 690.916C1530.94 688.789 1527.12 685.794 1524.03 682.214C1517.76 675.065 1514.28 666.192 1511.89 657.357C1509.82 648.376 1508.78 639.382 1507.24 630.465L1503.14 603.634L1508.95 630.186C1510.94 639.003 1512.46 647.979 1514.89 656.554C1517.31 665.073 1520.77 673.463 1526.6 679.913C1529.48 683.142 1532.96 685.8 1536.82 687.652C1540.72 689.671 1544.91 689.979 1548.97 693.094Z" fill="#975500"></path>
        <path id="Vector_25" d="M1561.16 554.332C1566.22 555.327 1571.17 557.33 1575.31 560.608C1579.42 563.946 1582.5 568.41 1584.68 573.19C1589.13 582.738 1590.94 593.169 1592.41 603.405C1593.49 613.735 1594.23 624.041 1594.65 634.348C1594.92 639.483 1595.33 644.632 1595.43 649.839C1595.43 652.434 1595.59 655.069 1595.19 657.702C1594.87 659.985 1594.14 663.905 1590.98 663.981C1593.44 662.86 1593.03 659.849 1593.44 657.529C1593.54 655.039 1593.66 652.49 1593.47 649.914C1593.21 644.808 1592.6 639.706 1592.16 634.532C1591.2 624.247 1590.63 613.953 1589.34 603.786C1588.19 593.634 1586.88 583.354 1582.93 573.985C1579.3 564.471 1571.26 557.008 1561.16 554.332Z" fill="#975500"></path>
      </g>
      <g id="Group_2">
        <path id="Vector_26" d="M1456.83 697.823C1454.67 675.424 1470.25 673.208 1511.81 665.381C1541.52 659.807 1573.32 648.701 1616.38 660.94C1665.53 674.901 1712.61 697.445 1717.82 745.55C1722.49 788.633 1704.12 945.264 1559.14 959.248C1414.15 973.231 1357.89 899.516 1340.93 770.039L1598.92 797.157C1598.92 797.157 1599.9 750.85 1567.61 740.252C1553.83 735.736 1526 743.124 1507.16 744.941C1488.32 746.758 1459.75 728.075 1456.83 697.823Z" fill="url(#paint18_linear_1_17)"></path>
        <path id="Vector_27" d="M1653.23 852.13C1596.17 903.418 1603.6 928.131 1546.32 933.656C1489.04 939.181 1449.13 912.097 1420.45 888.15C1391.77 864.203 1365.49 822.236 1351.46 789.663C1348.15 781.971 1344.55 775.648 1340.95 770.293C1357.96 899.622 1414.23 973.222 1559.11 959.249C1704.1 945.266 1722.46 788.607 1717.79 745.552C1715.74 726.705 1707.24 711.845 1694.74 699.823C1703.9 761.118 1700.09 810.007 1653.23 852.13Z" fill="url(#paint19_radial_1_17)"></path>
        <path id="Vector_28" d="M1609.4 750.933C1605.71 724.149 1570.47 700.436 1543.62 705.848C1520.44 710.535 1478.35 717.844 1457.7 702.103C1462.82 729.748 1489.29 746.695 1507.17 744.971C1525.98 743.157 1553.83 735.766 1567.61 740.282C1599.91 750.88 1598.93 797.187 1598.93 797.187C1598.93 797.187 1613.1 777.717 1609.4 750.933Z" fill="url(#paint20_radial_1_17)"></path>
        <path id="Vector_29" d="M1717.79 745.584C1712.58 697.479 1665.51 674.935 1616.35 660.974C1573.29 648.735 1541.49 659.813 1511.78 665.415C1480.11 671.377 1463.59 674.139 1458.48 685.038C1496.91 671.382 1533.44 663.811 1579.42 664.679C1639.37 665.825 1687.73 698.45 1698.6 725.968C1709.34 753.127 1713.17 805.299 1713.26 806.517C1718.5 780.724 1719.18 758.222 1717.79 745.584Z" fill="url(#paint21_linear_1_17)"></path>
        <path id="Vector_30" d="M1598.93 797.159C1598.62 786.27 1596.68 775.31 1592.32 765.353C1588.12 755.495 1580.83 746.391 1570.78 742.4C1560.96 737.873 1549.59 739.939 1538.96 741.164C1528.16 742.662 1517.52 744.971 1506.5 745.977C1483.65 746.184 1463.58 728.477 1457.34 707.184C1455.77 701.805 1454.97 696.237 1455.47 690.487C1455.94 684.712 1459.64 679.052 1464.68 676.257C1474.71 670.586 1485.73 669.01 1496.37 666.672C1517.96 663.222 1538.93 657.208 1560.92 654.944C1582.83 652.489 1605.2 655.606 1625.92 662.645C1646.72 669.306 1667.39 677.547 1685.13 690.661C1702.85 703.548 1716.01 723.49 1717.79 745.498C1715.47 723.514 1702 704.2 1684.22 691.889C1666.6 679.134 1646.04 671.082 1625.32 664.642C1604.64 657.798 1582.79 654.974 1561.2 657.54C1539.67 659.901 1518.49 666.135 1496.97 669.721C1486.41 671.909 1475.31 673.578 1466.17 678.68C1461.62 681.227 1458.69 685.673 1458.16 690.827C1457.68 695.947 1458.35 701.414 1459.81 706.49C1465.44 726.758 1484.96 744.034 1506.32 743.912C1517.07 743.018 1527.83 740.783 1538.67 739.367C1549.34 738.252 1560.93 736.08 1571.36 741.004C1581.73 745.392 1588.96 754.987 1592.98 765.033C1597.18 775.261 1598.87 786.274 1598.93 797.159Z" fill="#975500"></path>
        <path id="Vector_31" opacity="0.75" d="M1368.05 771.9C1356.31 789.396 1405.79 878.903 1448 898.58C1490.21 918.257 1539.59 906.196 1547.53 886.557C1555.5 866.916 1511.15 841.857 1474.1 812.96C1410.13 763.108 1379.81 754.401 1368.05 771.9Z" fill="url(#paint22_radial_1_17)"></path>
        <path id="Vector_32" opacity="0.75" d="M1694.79 752.448C1700.95 742.132 1659.8 685.748 1629.99 672.344C1600.19 658.939 1545.5 673.879 1542.04 685.644C1538.59 697.409 1593.43 705.006 1620.71 723.871C1667.76 756.48 1688.66 762.789 1694.79 752.448Z" fill="url(#paint23_radial_1_17)"></path>
      </g>
      <g id="Group_3">
        <path id="Vector_33" d="M1368.59 823.318C1338.02 779.824 1352.45 698.238 1346.03 683.12C1339.61 668.002 1335.56 608.838 1317.28 556.804C1306.2 525.202 1301.14 502.682 1305.02 482.267C1288.47 497.803 1296.33 526.666 1304.78 554.303C1311.86 577.454 1328.31 641.922 1339.37 685.872C1336.69 716.92 1339.05 750.903 1340.9 770.053C1356.16 886.637 1403.51 957.762 1518.53 960.638C1447.63 955.359 1397.2 864.034 1368.59 823.318Z" fill="url(#paint24_linear_1_17)"></path>
        <path id="Vector_34" d="M1544.88 960.152C1541.65 959.98 1537.86 960.06 1533.31 960.498C1528.85 960.929 1524.49 960.893 1520.19 960.681C1528.1 960.83 1536.35 960.633 1544.88 960.152Z" fill="url(#paint25_linear_1_17)"></path>
      </g>
    </g>
    <g id="astro">
      <path id="Vector_35" fill-rule="evenodd" clip-rule="evenodd" d="M815.039 113.644C824.758 125.709 829.714 141.99 839.626 174.553L1056.17 885.901C976.107 844.368 889.072 814.413 797.281 798.252L656.29 321.798C653.983 314.002 646.822 308.654 638.693 308.654C630.542 308.654 623.368 314.03 621.08 321.853L481.795 798.011C389.579 814.1 302.146 844.109 221.741 885.793L439.347 174.388H439.348C449.291 141.882 454.262 125.629 463.982 113.585C472.562 102.953 483.723 94.6958 496.4 89.6002C510.76 83.8284 527.756 83.8284 561.749 83.8284H717.174C751.212 83.8284 768.23 83.8284 782.603 89.6123C795.292 94.7184 806.459 102.992 815.039 113.644Z" fill="url(#paint26_linear_1_17)"></path>
      <path id="Vector_36" fill-rule="evenodd" clip-rule="evenodd" d="M840.951 919.754C805.253 950.279 734.002 971.097 651.929 971.097C551.197 971.097 466.767 939.737 444.363 897.561C436.354 921.732 434.558 949.396 434.558 967.068C434.558 967.068 429.281 1053.84 489.636 1114.2C489.636 1082.86 515.042 1057.46 546.381 1057.46C600.097 1057.46 600.036 1104.32 599.987 1142.34C599.986 1143.48 599.984 1144.61 599.984 1145.73C599.984 1203.44 635.255 1252.91 685.416 1273.77C677.924 1258.36 673.721 1241.05 673.721 1222.77C673.721 1167.73 706.034 1147.23 743.588 1123.41C773.469 1104.46 806.668 1083.41 829.548 1041.17C841.486 1019.13 848.265 993.893 848.265 967.068C848.265 950.573 845.702 934.676 840.951 919.754Z" fill="#FF5D01"></path>
      <path id="Vector_37" fill-rule="evenodd" clip-rule="evenodd" d="M840.951 919.754C805.253 950.279 734.002 971.097 651.929 971.097C551.197 971.097 466.767 939.737 444.363 897.561C436.354 921.732 434.558 949.396 434.558 967.068C434.558 967.068 429.281 1053.84 489.636 1114.2C489.636 1082.86 515.042 1057.46 546.381 1057.46C600.097 1057.46 600.036 1104.32 599.987 1142.34C599.986 1143.48 599.984 1144.61 599.984 1145.73C599.984 1203.44 635.255 1252.91 685.416 1273.77C677.924 1258.36 673.721 1241.05 673.721 1222.77C673.721 1167.73 706.034 1147.23 743.588 1123.41C773.469 1104.46 806.668 1083.41 829.548 1041.17C841.486 1019.13 848.265 993.893 848.265 967.068C848.265 950.573 845.702 934.676 840.951 919.754Z" fill="url(#paint27_linear_1_17)"></path>
    </g>
  </g>
  <defs>
    <linearGradient id="paint0_linear_1_17" x1="1652.69" y1="820.864" x2="1627.77" y2="562.533" gradientUnits="userSpaceOnUse">
      <stop offset="0.00132565" stop-color="#FFBA47"></stop>
      <stop offset="1" stop-color="#FFD748"></stop>
    </linearGradient>
    <linearGradient id="paint1_linear_1_17" x1="1634.26" y1="305.282" x2="1681.23" y2="792.332" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#FFBC47"></stop>
    </linearGradient>
    <linearGradient id="paint2_linear_1_17" x1="1563.7" y1="312.086" x2="1610.67" y2="799.137" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#FFBC47"></stop>
    </linearGradient>
    <linearGradient id="paint3_linear_1_17" x1="1362.55" y1="671.541" x2="1370.08" y2="535.099" gradientUnits="userSpaceOnUse">
      <stop offset="0.00132565" stop-color="#FFCB4B"></stop>
      <stop offset="1" stop-color="#FFD748"></stop>
    </linearGradient>
    <linearGradient id="paint4_linear_1_17" x1="1358.68" y1="458.589" x2="1397.45" y2="646.011" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#FFBC47"></stop>
    </linearGradient>
    <linearGradient id="paint5_linear_1_17" x1="1351.37" y1="767.436" x2="1701.03" y2="733.714" gradientUnits="userSpaceOnUse">
      <stop offset="0.00132565" stop-color="#FFCB4B"></stop>
      <stop offset="1" stop-color="#FFD748"></stop>
    </linearGradient>
    <linearGradient id="paint6_linear_1_17" x1="1507.87" y1="926.485" x2="1514.93" y2="594.662" gradientUnits="userSpaceOnUse">
      <stop stop-color="#A1541E" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#C86F34"></stop>
    </linearGradient>
    <linearGradient id="paint7_linear_1_17" x1="1461.51" y1="640.918" x2="1474.71" y2="777.806" gradientUnits="userSpaceOnUse">
      <stop offset="0.00132565" stop-color="#FFCB4B"></stop>
      <stop offset="1" stop-color="#FFD748"></stop>
    </linearGradient>
    <linearGradient id="paint8_linear_1_17" x1="1460.13" y1="627.75" x2="1480.02" y2="833.978" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#C86F34"></stop>
    </linearGradient>
    <linearGradient id="paint9_linear_1_17" x1="1464.3" y1="672.909" x2="1452.78" y2="553.437" gradientUnits="userSpaceOnUse">
      <stop offset="0.00132565" stop-color="#FFCB4B"></stop>
      <stop offset="1" stop-color="#FFD748"></stop>
    </linearGradient>
    <linearGradient id="paint10_linear_1_17" x1="1404.83" y1="616.045" x2="1775.04" y2="781.578" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#C86F34"></stop>
    </linearGradient>
    <linearGradient id="paint11_linear_1_17" x1="1464.31" y1="897.178" x2="1583.8" y2="364.189" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#C86F34"></stop>
    </linearGradient>
    <radialGradient id="paint12_radial_1_17" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1328.36 500.511) rotate(124.764) scale(25.3755 13.4331)">
      <stop stop-color="#FBE07A"></stop>
      <stop offset="0.2654" stop-color="#FCDF73" stop-opacity="0.7346"></stop>
      <stop offset="0.6548" stop-color="#FDDB5F" stop-opacity="0.3452"></stop>
      <stop offset="1" stop-color="#FFD748" stop-opacity="0"></stop>
    </radialGradient>
    <radialGradient id="paint13_radial_1_17" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1608.51 385.138) rotate(-138.945) scale(25.3818 13.436)">
      <stop stop-color="#FBE07A"></stop>
      <stop offset="0.2654" stop-color="#FCDF73" stop-opacity="0.7346"></stop>
      <stop offset="0.6548" stop-color="#FDDB5F" stop-opacity="0.3452"></stop>
      <stop offset="1" stop-color="#FFD748" stop-opacity="0"></stop>
    </radialGradient>
    <linearGradient id="paint14_linear_1_17" x1="1549.11" y1="619.865" x2="1557.76" y2="754.158" gradientUnits="userSpaceOnUse">
      <stop offset="0.00132565" stop-color="#FFCB4B"></stop>
      <stop offset="1" stop-color="#FFD748"></stop>
    </linearGradient>
    <linearGradient id="paint15_linear_1_17" x1="1548.16" y1="606.57" x2="1561.11" y2="807.425" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#C86F34"></stop>
    </linearGradient>
    <linearGradient id="paint16_linear_1_17" x1="1550.12" y1="639.989" x2="1543.44" y2="536.259" gradientUnits="userSpaceOnUse">
      <stop offset="0.00132565" stop-color="#FFCB4B"></stop>
      <stop offset="1" stop-color="#FFD748"></stop>
    </linearGradient>
    <linearGradient id="paint17_linear_1_17" x1="1494.86" y1="594.253" x2="1844.82" y2="764.273" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#C86F34"></stop>
    </linearGradient>
    <linearGradient id="paint18_linear_1_17" x1="1356.06" y1="827.449" x2="1707.12" y2="793.591" gradientUnits="userSpaceOnUse">
      <stop offset="0.00132565" stop-color="#FFCB4B"></stop>
      <stop offset="1" stop-color="#FFD748"></stop>
    </linearGradient>
    <radialGradient id="paint19_radial_1_17" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1492.27 438.663) rotate(-5.50877) scale(632.216 639.784)">
      <stop offset="0.6134" stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#FF8900"></stop>
    </radialGradient>
    <radialGradient id="paint20_radial_1_17" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1562.61 668.392) rotate(-5.50877) scale(412.016 178.572)">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#FFA754"></stop>
    </radialGradient>
    <linearGradient id="paint21_linear_1_17" x1="1599.3" y1="621.055" x2="1568.98" y2="917.303" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#FFBC47"></stop>
    </linearGradient>
    <radialGradient id="paint22_radial_1_17" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1454.77 844.747) rotate(-144.138) scale(117.478 53.6861)">
      <stop stop-color="#FBE07A"></stop>
      <stop offset="0.2654" stop-color="#FCDF73" stop-opacity="0.7346"></stop>
      <stop offset="0.6548" stop-color="#FDDB5F" stop-opacity="0.3452"></stop>
      <stop offset="1" stop-color="#FFD748" stop-opacity="0"></stop>
    </radialGradient>
    <radialGradient id="paint23_radial_1_17" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1621.2 700.967) rotate(33.037) scale(90.531 33.4191)">
      <stop stop-color="#FBE07A"></stop>
      <stop offset="0.2654" stop-color="#FCDF73" stop-opacity="0.7346"></stop>
      <stop offset="0.6548" stop-color="#FDDB5F" stop-opacity="0.3452"></stop>
      <stop offset="1" stop-color="#FFD748" stop-opacity="0"></stop>
    </radialGradient>
    <linearGradient id="paint24_linear_1_17" x1="1613.96" y1="699.227" x2="432.656" y2="829.12" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#C86F34"></stop>
    </linearGradient>
    <linearGradient id="paint25_linear_1_17" x1="1617.7" y1="417.309" x2="1386.62" y2="1891.08" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFBC47" stop-opacity="0"></stop>
      <stop offset="1" stop-color="#C86F34"></stop>
    </linearGradient>
    <linearGradient id="paint26_linear_1_17" x1="882.997" y1="46.1132" x2="638.955" y2="885.902" gradientUnits="userSpaceOnUse">
      <stop stop-color="#000014"></stop>
      <stop offset="1" stop-color="#150426"></stop>
    </linearGradient>
    <linearGradient id="paint27_linear_1_17" x1="1001.68" y1="671.45" x2="790.326" y2="1113.91" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FF1639"></stop>
      <stop offset="1" stop-color="#FF1639" stop-opacity="0"></stop>
    </linearGradient>
  </defs>
</svg>`;
}, "/Users/mimecine/Projects/kastro/src/components/Logo.astro");

function noop() { }
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
const ATTR_REGEX = /[&"]/g;
const CONTENT_REGEX = /[&<]/g;
/**
 * Note: this method is performance sensitive and has been optimized
 * https://github.com/sveltejs/svelte/pull/5701
 */
function escape(value, is_attr = false) {
    const str = String(value);
    const pattern = is_attr ? ATTR_REGEX : CONTENT_REGEX;
    pattern.lastIndex = 0;
    let escaped = '';
    let last = 0;
    while (pattern.test(str)) {
        const i = pattern.lastIndex - 1;
        const ch = str[i];
        escaped += str.substring(last, i) + (ch === '&' ? '&amp;' : (ch === '"' ? '&quot;' : '&lt;'));
        last = i + 1;
    }
    return escaped + str.substring(last);
}
function each(items, fn) {
    let str = '';
    for (let i = 0; i < items.length; i += 1) {
        str += fn(items[i], i);
    }
    return str;
}
function validate_component(component, name) {
    if (!component || !component.$$render) {
        if (name === 'svelte:component')
            name += ' this={...}';
        throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules. Otherwise you may need to fix a <${name}>.`);
    }
    return component;
}
let on_destroy;
function create_ssr_component(fn) {
    function $$render(result, props, bindings, slots, context) {
        const parent_component = current_component;
        const $$ = {
            on_destroy,
            context: new Map(context || (parent_component ? parent_component.$$.context : [])),
            // these will be immediately discarded
            on_mount: [],
            before_update: [],
            after_update: [],
            callbacks: blank_object()
        };
        set_current_component({ $$ });
        const html = fn(result, props, bindings, slots);
        set_current_component(parent_component);
        return html;
    }
    return {
        render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
            on_destroy = [];
            const result = { title: '', head: '', css: new Set() };
            const html = $$render(result, props, {}, $$slots, context);
            run_all(on_destroy);
            return {
                html,
                css: {
                    code: Array.from(result.css).map(css => css.code).join('\n'),
                    map: null // TODO
                },
                head: result.title + result.head
            };
        },
        $$render
    };
}
function add_attribute(name, value, boolean) {
    if (value == null || (boolean && !value))
        return '';
    const assignment = (boolean && value === true) ? '' : `="${escape(value, true)}"`;
    return ` ${name}${assignment}`;
}

const isCartDrawerOpen = atom(false);
const isCartUpdating = atom(false);
const emptyCart = {
  id: "",
  checkoutUrl: "",
  totalQuantity: 0,
  lines: { nodes: [] },
  cost: { totalAmount: { amount: "", currencyCode: "" } }
};
const cart = persistentAtom(
  "cart",
  emptyCart,
  {
    encode: JSON.stringify,
    decode: JSON.parse
  }
);

/* src/components/CartIcon.svelte generated by Svelte v3.56.0 */

const CartIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let $cart, $$unsubscribe_cart;
	$$unsubscribe_cart = subscribe(cart, value => $cart = value);

	$$unsubscribe_cart();

	return `<div><button class="relative"><span class="sr-only">Open your cart</span>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-7 h-7 sm:w-8 sm:h-8 pointer-events-none"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"></path></svg>
    ${$cart && $cart.totalQuantity > 0
	? `<div class="absolute -right-2 -top-1 sm:-right-1 sm:top-0 bg-emerald-900 text-white text-[12px] rounded-full"><span class="w-5 h-5 flex justify-center text-center items-center">${escape($cart.totalQuantity)}</span></div>`
	: ``}</button></div>`;
});

const $$Astro$f = createAstro();
const $$Header = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$f, $$props, $$slots);
  Astro2.self = $$Header;
  return renderTemplate`${maybeRenderHead($$result)}<header class="sticky top-0 z-40">
  <div class="border-b bg-white/70 py-3 backdrop-blur-2xl">
    <nav class="container grid grid-cols-3 items-center">
      <a href="/">
        <span class="sr-only">Logo</span>
        ${renderComponent($$result, "Logo", $$Logo, {})}
      </a>
      <h1 class="flex justify-center text-sm font-semibold text-gray-900 sm:text-xl">
        Astro 🧑‍🚀 Shopify
      </h1>
      <div class="justify-self-end">
        ${renderComponent($$result, "CartIcon", CartIcon, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/mimecine/Projects/kastro/src/components/CartIcon.svelte", "client:component-export": "default" })}
      </div>
    </nav>
  </div>
</header>`;
}, "/Users/mimecine/Projects/kastro/src/components/Header.astro");

const $$Astro$e = createAstro();
const $$Footer = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$e, $$props, $$slots);
  Astro2.self = $$Footer;
  return renderTemplate`${maybeRenderHead($$result)}<footer class="text-sm text-gray-600">
  <div class="container grid items-center gap-5 py-8 sm:flex sm:gap-10">
    <a href="https://astro.build" target="_blank" class="flex max-w-fit items-center gap-2" rel="noopener noreferrer">
      <svg class="h-auto w-6" width="1280" height="1280" viewBox="0 0 1280 1280" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M815.039 94.6439C824.758 106.709 829.714 122.99 839.626 155.553L1056.17 866.901C976.107 825.368 889.072 795.413 797.281 779.252L656.29 302.798C653.983 295.002 646.822 289.654 638.693 289.654C630.542 289.654 623.368 295.03 621.08 302.853L481.795 779.011C389.579 795.1 302.146 825.109 221.741 866.793L439.347 155.388L439.348 155.388C449.291 122.882 454.262 106.629 463.982 94.5853C472.562 83.9531 483.723 75.6958 496.4 70.6002C510.76 64.8284 527.756 64.8284 561.749 64.8284H717.174C751.212 64.8284 768.23 64.8284 782.603 70.6123C795.292 75.7184 806.459 83.9923 815.039 94.6439Z" fill="url(#paint0_linear_709_110)"></path>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M840.951 900.754C805.253 931.279 734.002 952.097 651.929 952.097C551.197 952.097 466.767 920.737 444.363 878.561C436.354 902.732 434.558 930.396 434.558 948.068C434.558 948.068 429.281 1034.84 489.636 1095.2C489.636 1063.86 515.042 1038.46 546.381 1038.46C600.097 1038.46 600.036 1085.32 599.987 1123.34C599.986 1124.48 599.984 1125.61 599.984 1126.73C599.984 1184.44 635.255 1233.91 685.416 1254.77C677.924 1239.36 673.721 1222.05 673.721 1203.77C673.721 1148.73 706.034 1128.23 743.588 1104.41L743.588 1104.41C773.469 1085.46 806.668 1064.41 829.548 1022.17C841.486 1000.13 848.265 974.893 848.265 948.068C848.265 931.573 845.702 915.676 840.951 900.754Z" fill="#FF5D01"></path>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M840.951 900.754C805.253 931.279 734.002 952.097 651.929 952.097C551.197 952.097 466.767 920.737 444.363 878.561C436.354 902.732 434.558 930.396 434.558 948.068C434.558 948.068 429.281 1034.84 489.636 1095.2C489.636 1063.86 515.042 1038.46 546.381 1038.46C600.097 1038.46 600.036 1085.32 599.987 1123.34C599.986 1124.48 599.984 1125.61 599.984 1126.73C599.984 1184.44 635.255 1233.91 685.416 1254.77C677.924 1239.36 673.721 1222.05 673.721 1203.77C673.721 1148.73 706.034 1128.23 743.588 1104.41L743.588 1104.41C773.469 1085.46 806.668 1064.41 829.548 1022.17C841.486 1000.13 848.265 974.893 848.265 948.068C848.265 931.573 845.702 915.676 840.951 900.754Z" fill="url(#paint1_linear_709_110)"></path>
        <defs>
          <linearGradient id="paint0_linear_709_110" x1="882.997" y1="27.1132" x2="638.955" y2="866.902" gradientUnits="userSpaceOnUse">
            <stop stop-color="#000014"></stop>
            <stop offset="1" stop-color="#150426"></stop>
          </linearGradient>
          <linearGradient id="paint1_linear_709_110" x1="1001.68" y1="652.45" x2="790.326" y2="1094.91" gradientUnits="userSpaceOnUse">
            <stop stop-color="#FF1639"></stop>
            <stop offset="1" stop-color="#FF1639" stop-opacity="0"></stop>
          </linearGradient>
        </defs>
      </svg>

      Made with Astro
    </a>
    <a class="flex items-center gap-2" href="https://github.com/thomasKn/astro-shopify/" target="_blank" rel="noopener noreferrer">
      <svg class="h-5 w-5 text-gray-500" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1989_191)"><path d="M7.00001 0C3.13391 0 0 3.21295 0 7.17755C0 10.3482 2.0055 13.0388 4.7873 13.9875C5.1373 14.0534 5.26471 13.832 5.26471 13.6414C5.26471 13.4716 5.25912 13.0195 5.25561 12.4212C3.3082 12.8547 2.8973 11.4589 2.8973 11.4589C2.5795 10.6291 2.1203 10.4084 2.1203 10.4084C1.48471 9.96418 2.16861 9.97279 2.16861 9.97279C2.87071 10.0229 3.24032 10.7122 3.24032 10.7122C3.86472 11.8085 4.87903 11.4918 5.27732 11.3084C5.34171 10.8448 5.52232 10.5288 5.72251 10.3497C4.16851 10.1684 2.534 9.55218 2.534 6.80211C2.534 6.01893 2.807 5.37764 3.2543 4.87605C3.1822 4.69476 2.94211 3.96463 3.32289 2.97722C3.32289 2.97722 3.91089 2.78376 5.24789 3.71238C5.77305 3.55992 6.37629 3.47184 6.99948 3.4709C7.59448 3.47377 8.19351 3.5533 8.7528 3.71238C10.0891 2.78376 10.6757 2.97649 10.6757 2.97649C11.0579 3.9646 10.8171 4.69475 10.7457 4.87603C11.1937 5.3776 11.4653 6.0189 11.4653 6.80208C11.4653 9.55931 9.82799 10.1662 8.26908 10.3439C8.52037 10.5653 8.74368 11.0031 8.74368 11.6731C8.74368 12.6318 8.73529 13.4064 8.73529 13.6414C8.73529 13.8335 8.86129 14.057 9.21689 13.9868C12.0205 13.0032 14 10.3285 14 7.18046C14 7.17943 14 7.17841 14 7.17738C14 3.21278 10.8654 0 7.00001 0Z" fill="currentColor"></path></g><defs><clipPath id="clip0_1989_191"><rect width="14" height="14" fill="white"></rect></clipPath></defs></svg>
      View source
    </a>

    <a class="flex items-center gap-2" href="https://svelte.dev" rel="noopener noreferrer" target="_blank">
      <svg class="h-auto w-5" viewBox="0 0 98.1 118">
        <style type="text/css">
          .st0 {
            fill: #ff3e00;
          }
          .st1 {
            fill: #ffffff;
          }
        </style>
        <path class="st0" d="M91.8,15.6C80.9-0.1,59.2-4.7,43.6,5.2L16.1,22.8C8.6,27.5,3.4,35.2,1.9,43.9c-1.3,7.3-0.2,14.8,3.3,21.3  c-2.4,3.6-4,7.6-4.7,11.8c-1.6,8.9,0.5,18.1,5.7,25.4c11,15.7,32.6,20.3,48.2,10.4l27.5-17.5c7.5-4.7,12.7-12.4,14.2-21.1  c1.3-7.3,0.2-14.8-3.3-21.3c2.4-3.6,4-7.6,4.7-11.8C99.2,32.1,97.1,22.9,91.8,15.6"></path>
        <path class="st1" d="M40.9,103.9c-8.9,2.3-18.2-1.2-23.4-8.7c-3.2-4.4-4.4-9.9-3.5-15.3c0.2-0.9,0.4-1.7,0.6-2.6l0.5-1.6l1.4,1  c3.3,2.4,6.9,4.2,10.8,5.4l1,0.3l-0.1,1c-0.1,1.4,0.3,2.9,1.1,4.1c1.6,2.3,4.4,3.4,7.1,2.7c0.6-0.2,1.2-0.4,1.7-0.7L65.5,72  c1.4-0.9,2.3-2.2,2.6-3.8c0.3-1.6-0.1-3.3-1-4.6c-1.6-2.3-4.4-3.3-7.1-2.6c-0.6,0.2-1.2,0.4-1.7,0.7l-10.5,6.7  c-1.7,1.1-3.6,1.9-5.6,2.4c-8.9,2.3-18.2-1.2-23.4-8.7c-3.1-4.4-4.4-9.9-3.4-15.3c0.9-5.2,4.1-9.9,8.6-12.7l27.5-17.5  c1.7-1.1,3.6-1.9,5.6-2.5c8.9-2.3,18.2,1.2,23.4,8.7c3.2,4.4,4.4,9.9,3.5,15.3c-0.2,0.9-0.4,1.7-0.7,2.6l-0.5,1.6l-1.4-1  c-3.3-2.4-6.9-4.2-10.8-5.4l-1-0.3l0.1-1c0.1-1.4-0.3-2.9-1.1-4.1c-1.6-2.3-4.4-3.3-7.1-2.6c-0.6,0.2-1.2,0.4-1.7,0.7L32.4,46.1  c-1.4,0.9-2.3,2.2-2.6,3.8s0.1,3.3,1,4.6c1.6,2.3,4.4,3.3,7.1,2.6c0.6-0.2,1.2-0.4,1.7-0.7l10.5-6.7c1.7-1.1,3.6-1.9,5.6-2.5  c8.9-2.3,18.2,1.2,23.4,8.7c3.2,4.4,4.4,9.9,3.5,15.3c-0.9,5.2-4.1,9.9-8.6,12.7l-27.5,17.5C44.8,102.5,42.9,103.3,40.9,103.9"></path>
      </svg>

      Built with Svelte
    </a>

    <a rel="noopener noreferrer" target="_blank" class="flex items-center gap-2" href="https://tailwindcss.com">
      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 54 33"><g clip-path="url(#prefix__clip0)"><path fill="#38bdf8" fill-rule="evenodd" d="M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z" clip-rule="evenodd"></path></g><defs><clipPath id="prefix__clip0"><path fill="#fff" d="M0 0h54v32.4H0z"></path></clipPath></defs></svg>
      Designed using Tailwind CSS
    </a>

    <div class="flex items-center gap-2">
      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="17.5" height="20" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 292"><path fill="#95BF46" d="M223.774 57.34c-.201-1.46-1.48-2.268-2.537-2.357a19614 19614 0 0 0-23.383-1.743s-15.507-15.395-17.209-17.099c-1.703-1.703-5.029-1.185-6.32-.805c-.19.056-3.388 1.043-8.678 2.68c-5.18-14.906-14.322-28.604-30.405-28.604c-.444 0-.901.018-1.358.044C129.31 3.407 123.644.779 118.75.779c-37.465 0-55.364 46.835-60.976 70.635c-14.558 4.511-24.9 7.718-26.221 8.133c-8.126 2.549-8.383 2.805-9.45 10.462C21.3 95.806.038 260.235.038 260.235l165.678 31.042l89.77-19.42S223.973 58.8 223.775 57.34ZM156.49 40.848l-14.019 4.339c.005-.988.01-1.96.01-3.023c0-9.264-1.286-16.723-3.349-22.636c8.287 1.04 13.806 10.469 17.358 21.32Zm-27.638-19.483c2.304 5.773 3.802 14.058 3.802 25.238c0 .572-.005 1.095-.01 1.624c-9.117 2.824-19.024 5.89-28.953 8.966c5.575-21.516 16.025-31.908 25.161-35.828Zm-11.131-10.537c1.617 0 3.246.549 4.805 1.622c-12.007 5.65-24.877 19.88-30.312 48.297l-22.886 7.088C75.694 46.16 90.81 10.828 117.72 10.828Z"></path><path fill="#5E8E3E" d="M221.237 54.983a19614 19614 0 0 0-23.383-1.743s-15.507-15.395-17.209-17.099c-.637-.634-1.496-.959-2.394-1.099l-12.527 256.233l89.762-19.418S223.972 58.8 223.774 57.34c-.201-1.46-1.48-2.268-2.537-2.357"></path><path fill="#FFF" d="m135.242 104.585l-11.069 32.926s-9.698-5.176-21.586-5.176c-17.428 0-18.305 10.937-18.305 13.693c0 15.038 39.2 20.8 39.2 56.024c0 27.713-17.577 45.558-41.277 45.558c-28.44 0-42.984-17.7-42.984-17.7l7.615-25.16s14.95 12.835 27.565 12.835c8.243 0 11.596-6.49 11.596-11.232c0-19.616-32.16-20.491-32.16-52.724c0-27.129 19.472-53.382 58.778-53.382c15.145 0 22.627 4.338 22.627 4.338"></path></svg>
      Powered by Shopify
    </div>
  </div>
</footer>`;
}, "/Users/mimecine/Projects/kastro/src/components/Footer.astro");

/* src/components/ShopifyImage.svelte generated by Svelte v3.56.0 */

const ShopifyImage = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let { image } = $$props;
	let { classList = "" } = $$props;
	let { loading = "lazy" } = $$props;
	let { sizes } = $$props;
	const srcSetValues = [50, 100, 200, 450, 600, 750, 900, 1e3, 1250, 1500, 1750, 2e3, 2500];

	function imageFilter(size) {
		const { width, height = "" } = size;

		if (image && image.url.includes(".webp")) {
			return `${image.url.replace(".webp", "")}&width=${width}&height=${height}`;
		}

		return image && `${image.url}&width=${width}&height=${height}`;
	}

	if ($$props.image === void 0 && $$bindings.image && image !== void 0) $$bindings.image(image);
	if ($$props.classList === void 0 && $$bindings.classList && classList !== void 0) $$bindings.classList(classList);
	if ($$props.loading === void 0 && $$bindings.loading && loading !== void 0) $$bindings.loading(loading);
	if ($$props.sizes === void 0 && $$bindings.sizes && sizes !== void 0) $$bindings.sizes(sizes);

	return `${image
	? `<img${add_attribute("src", image.url, 0)}${add_attribute("alt", image.altText || "Default alt text", 0)}${add_attribute("class", classList, 0)}${add_attribute("width", image.width, 0)}${add_attribute("height", image.height, 0)}${add_attribute("loading", loading, 0)}${add_attribute("sizes", sizes, 0)}${add_attribute(
			"srcset",
			srcSetValues.filter(value => image && value < image.width).map(value => {
				if (image && image.width >= value) {
					return `${imageFilter({ width: value })} ${value}w`;
				}
			}).join(", ").concat(`, ${image.url} ${image.width}w`),
			0
		)}>`
	: `
  <svg class="bg-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525.5 525.5"><path d="M375.5 345.2c0-.1 0-.1 0 0 0-.1 0-.1 0 0-1.1-2.9-2.3-5.5-3.4-7.8-1.4-4.7-2.4-13.8-.5-19.8 3.4-10.6 3.6-40.6 1.2-54.5-2.3-14-12.3-29.8-18.5-36.9-5.3-6.2-12.8-14.9-15.4-17.9 8.6-5.6 13.3-13.3 14-23 0-.3 0-.6.1-.8.4-4.1-.6-9.9-3.9-13.5-2.1-2.3-4.8-3.5-8-3.5h-54.9c-.8-7.1-3-13-5.2-17.5-6.8-13.9-12.5-16.5-21.2-16.5h-.7c-8.7 0-14.4 2.5-21.2 16.5-2.2 4.5-4.4 10.4-5.2 17.5h-48.5c-3.2 0-5.9 1.2-8 3.5-3.2 3.6-4.3 9.3-3.9 13.5 0 .2 0 .5.1.8.7 9.8 5.4 17.4 14 23-2.6 3.1-10.1 11.7-15.4 17.9-6.1 7.2-16.1 22.9-18.5 36.9-2.2 13.3-1.2 47.4 1 54.9 1.1 3.8 1.4 14.5-.2 19.4-1.2 2.4-2.3 5-3.4 7.9-4.4 11.6-6.2 26.3-5 32.6 1.8 9.9 16.5 14.4 29.4 14.4h176.8c12.9 0 27.6-4.5 29.4-14.4 1.2-6.5-.5-21.1-5-32.7zm-97.7-178c.3-3.2.8-10.6-.2-18 2.4 4.3 5 10.5 5.9 18h-5.7zm-36.3-17.9c-1 7.4-.5 14.8-.2 18h-5.7c.9-7.5 3.5-13.7 5.9-18zm4.5-6.9c0-.1.1-.2.1-.4 4.4-5.3 8.4-5.8 13.1-5.8h.7c4.7 0 8.7.6 13.1 5.8 0 .1 0 .2.1.4 3.2 8.9 2.2 21.2 1.8 25h-30.7c-.4-3.8-1.3-16.1 1.8-25zm-70.7 42.5c0-.3 0-.6-.1-.9-.3-3.4.5-8.4 3.1-11.3 1-1.1 2.1-1.7 3.4-2.1l-.6.6c-2.8 3.1-3.7 8.1-3.3 11.6 0 .2 0 .5.1.8.3 3.5.9 11.7 10.6 18.8.3.2.8.2 1-.2.2-.3.2-.8-.2-1-9.2-6.7-9.8-14.4-10-17.7 0-.3 0-.6-.1-.8-.3-3.2.5-7.7 3-10.5.8-.8 1.7-1.5 2.6-1.9h155.7c1 .4 1.9 1.1 2.6 1.9 2.5 2.8 3.3 7.3 3 10.5 0 .2 0 .5-.1.8-.3 3.6-1 13.1-13.8 20.1-.3.2-.5.6-.3 1 .1.2.4.4.6.4.1 0 .2 0 .3-.1 13.5-7.5 14.3-17.5 14.6-21.3 0-.3 0-.5.1-.8.4-3.5-.5-8.5-3.3-11.6l-.6-.6c1.3.4 2.5 1.1 3.4 2.1 2.6 2.9 3.5 7.9 3.1 11.3 0 .3 0 .6-.1.9-1.5 20.9-23.6 31.4-65.5 31.4h-43.8c-41.8 0-63.9-10.5-65.4-31.4zm91 89.1h-7c0-1.5 0-3-.1-4.2-.2-12.5-2.2-31.1-2.7-35.1h3.6c.8 0 1.4-.6 1.4-1.4v-14.1h2.4v14.1c0 .8.6 1.4 1.4 1.4h3.7c-.4 3.9-2.4 22.6-2.7 35.1v4.2zm65.3 11.9h-16.8c-.4 0-.7.3-.7.7 0 .4.3.7.7.7h16.8v2.8h-62.2c0-.9-.1-1.9-.1-2.8h33.9c.4 0 .7-.3.7-.7 0-.4-.3-.7-.7-.7h-33.9c-.1-3.2-.1-6.3-.1-9h62.5v9zm-12.5 24.4h-6.3l.2-1.6h5.9l.2 1.6zm-5.8-4.5l1.6-12.3h2l1.6 12.3h-5.2zm-57-19.9h-62.4v-9h62.5c0 2.7 0 5.8-.1 9zm-62.4 1.4h62.4c0 .9-.1 1.8-.1 2.8H194v-2.8zm65.2 0h7.3c0 .9.1 1.8.1 2.8H259c.1-.9.1-1.8.1-2.8zm7.2-1.4h-7.2c.1-3.2.1-6.3.1-9h7c0 2.7 0 5.8.1 9zm-7.7-66.7v6.8h-9v-6.8h9zm-8.9 8.3h9v.7h-9v-.7zm0 2.1h9v2.3h-9v-2.3zm26-1.4h-9v-.7h9v.7zm-9 3.7v-2.3h9v2.3h-9zm9-5.9h-9v-6.8h9v6.8zm-119.3 91.1c-2.1-7.1-3-40.9-.9-53.6 2.2-13.5 11.9-28.6 17.8-35.6 5.6-6.5 13.5-15.7 15.7-18.3 11.4 6.4 28.7 9.6 51.8 9.6h6v14.1c0 .8.6 1.4 1.4 1.4h5.4c.3 3.1 2.4 22.4 2.7 35.1 0 1.2.1 2.6.1 4.2h-63.9c-.8 0-1.4.6-1.4 1.4v16.1c0 .8.6 1.4 1.4 1.4H256c-.8 11.8-2.8 24.7-8 33.3-2.6 4.4-4.9 8.5-6.9 12.2-.4.7-.1 1.6.6 1.9.2.1.4.2.6.2.5 0 1-.3 1.3-.8 1.9-3.7 4.2-7.7 6.8-12.1 5.4-9.1 7.6-22.5 8.4-34.7h7.8c.7 11.2 2.6 23.5 7.1 32.4.2.5.8.8 1.3.8.2 0 .4 0 .6-.2.7-.4 1-1.2.6-1.9-4.3-8.5-6.1-20.3-6.8-31.1H312l-2.4 18.6c-.1.4.1.8.3 1.1.3.3.7.5 1.1.5h9.6c.4 0 .8-.2 1.1-.5.3-.3.4-.7.3-1.1l-2.4-18.6H333c.8 0 1.4-.6 1.4-1.4v-16.1c0-.8-.6-1.4-1.4-1.4h-63.9c0-1.5 0-2.9.1-4.2.2-12.7 2.3-32 2.7-35.1h5.2c.8 0 1.4-.6 1.4-1.4v-14.1h6.2c23.1 0 40.4-3.2 51.8-9.6 2.3 2.6 10.1 11.8 15.7 18.3 5.9 6.9 15.6 22.1 17.8 35.6 2.2 13.4 2 43.2-1.1 53.1-1.2 3.9-1.4 8.7-1 13-1.7-2.8-2.9-4.4-3-4.6-.2-.3-.6-.5-.9-.6h-.5c-.2 0-.4.1-.5.2-.6.5-.8 1.4-.3 2 0 0 .2.3.5.8 1.4 2.1 5.6 8.4 8.9 16.7h-42.9v-43.8c0-.8-.6-1.4-1.4-1.4s-1.4.6-1.4 1.4v44.9c0 .1-.1.2-.1.3 0 .1 0 .2.1.3v9c-1.1 2-3.9 3.7-10.5 3.7h-7.5c-.4 0-.7.3-.7.7 0 .4.3.7.7.7h7.5c5 0 8.5-.9 10.5-2.8-.1 3.1-1.5 6.5-10.5 6.5H210.4c-9 0-10.5-3.4-10.5-6.5 2 1.9 5.5 2.8 10.5 2.8h67.4c.4 0 .7-.3.7-.7 0-.4-.3-.7-.7-.7h-67.4c-6.7 0-9.4-1.7-10.5-3.7v-54.5c0-.8-.6-1.4-1.4-1.4s-1.4.6-1.4 1.4v43.8h-43.6c4.2-10.2 9.4-17.4 9.5-17.5.5-.6.3-1.5-.3-2s-1.5-.3-2 .3c-.1.2-1.4 2-3.2 5 .1-4.9-.4-10.2-1.1-12.8zm221.4 60.2c-1.5 8.3-14.9 12-26.6 12H174.4c-11.8 0-25.1-3.8-26.6-12-1-5.7.6-19.3 4.6-30.2H197v9.8c0 6.4 4.5 9.7 13.4 9.7h105.4c8.9 0 13.4-3.3 13.4-9.7v-9.8h44c4 10.9 5.6 24.5 4.6 30.2z"></path><path d="M286.1 359.3c0 .4.3.7.7.7h14.7c.4 0 .7-.3.7-.7 0-.4-.3-.7-.7-.7h-14.7c-.3 0-.7.3-.7.7zm5.3-145.6c13.5-.5 24.7-2.3 33.5-5.3.4-.1.6-.5.4-.9-.1-.4-.5-.6-.9-.4-8.6 3-19.7 4.7-33 5.2-.4 0-.7.3-.7.7 0 .4.3.7.7.7zm-11.3.1c.4 0 .7-.3.7-.7 0-.4-.3-.7-.7-.7H242c-19.9 0-35.3-2.5-45.9-7.4-.4-.2-.8 0-.9.3-.2.4 0 .8.3.9 10.8 5 26.4 7.5 46.5 7.5h38.1zm-7.2 116.9c.4.1.9.1 1.4.1 1.7 0 3.4-.7 4.7-1.9 1.4-1.4 1.9-3.2 1.5-5-.2-.8-.9-1.2-1.7-1.1-.8.2-1.2.9-1.1 1.7.3 1.2-.4 2-.7 2.4-.9.9-2.2 1.3-3.4 1-.8-.2-1.5.3-1.7 1.1s.2 1.5 1 1.7z"></path><path d="M275.5 331.6c-.8 0-1.4.6-1.5 1.4 0 .8.6 1.4 1.4 1.5h.3c3.6 0 7-2.8 7.7-6.3.2-.8-.4-1.5-1.1-1.7-.8-.2-1.5.4-1.7 1.1-.4 2.3-2.8 4.2-5.1 4zm5.4 1.6c-.6.5-.6 1.4-.1 2 1.1 1.3 2.5 2.2 4.2 2.8.2.1.3.1.5.1.6 0 1.1-.3 1.3-.9.3-.7-.1-1.6-.8-1.8-1.2-.5-2.2-1.2-3-2.1-.6-.6-1.5-.6-2.1-.1zm-38.2 12.7c.5 0 .9 0 1.4-.1.8-.2 1.3-.9 1.1-1.7-.2-.8-.9-1.3-1.7-1.1-1.2.3-2.5-.1-3.4-1-.4-.4-1-1.2-.8-2.4.2-.8-.3-1.5-1.1-1.7-.8-.2-1.5.3-1.7 1.1-.4 1.8.1 3.7 1.5 5 1.2 1.2 2.9 1.9 4.7 1.9z"></path><path d="M241.2 349.6h.3c.8 0 1.4-.7 1.4-1.5s-.7-1.4-1.5-1.4c-2.3.1-4.6-1.7-5.1-4-.2-.8-.9-1.3-1.7-1.1-.8.2-1.3.9-1.1 1.7.7 3.5 4.1 6.3 7.7 6.3zm-9.7 3.6c.2 0 .3 0 .5-.1 1.6-.6 3-1.6 4.2-2.8.5-.6.5-1.5-.1-2s-1.5-.5-2 .1c-.8.9-1.8 1.6-3 2.1-.7.3-1.1 1.1-.8 1.8 0 .6.6.9 1.2.9z"></path></svg>`}`;
});

/* src/components/Money.svelte generated by Svelte v3.56.0 */

const Money = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let formatPrice;
	let { price } = $$props;
	let { showCurrency = false } = $$props;
	if ($$props.price === void 0 && $$bindings.price && price !== void 0) $$bindings.price(price);
	if ($$props.showCurrency === void 0 && $$bindings.showCurrency && showCurrency !== void 0) $$bindings.showCurrency(showCurrency);

	formatPrice = new Intl.NumberFormat("en-US",
	{
			style: "currency",
			currency: price.currencyCode,
			currencyDisplay: showCurrency ? "symbol" : "narrowSymbol"
		}).format(parseInt(price.amount));

	return `<span>${escape(formatPrice)}</span>`;
});

/* src/components/CartDrawer.svelte generated by Svelte v3.56.0 */

const CartDrawer = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let cartIsUpdatingClass;
	let $isCartDrawerOpen, $$unsubscribe_isCartDrawerOpen;
	let $isCartUpdating, $$unsubscribe_isCartUpdating;
	let $cart, $$unsubscribe_cart;
	$$unsubscribe_isCartDrawerOpen = subscribe(isCartDrawerOpen, value => $isCartDrawerOpen = value);
	$$unsubscribe_isCartUpdating = subscribe(isCartUpdating, value => $isCartUpdating = value);
	$$unsubscribe_cart = subscribe(cart, value => $cart = value);
	let cartDrawerEl;

	cartIsUpdatingClass = $isCartUpdating ? "opacity-50 pointer-events-none" : "";

	{
		{
			if ($isCartDrawerOpen) {
				document.querySelector("body")?.classList.add("overflow-hidden");
			}
		}
	}

	$$unsubscribe_isCartDrawerOpen();
	$$unsubscribe_isCartUpdating();
	$$unsubscribe_cart();

	return `${$isCartDrawerOpen
	? `<div class="relative z-50" aria-labelledby="slide-over-title" role="dialog" aria-modal="true"><div class="fixed inset-0 bg-slate-400/50 backdrop-blur-sm transition-opacity"></div>

    <div class="fixed inset-0 overflow-hidden"><div class="absolute inset-0 overflow-hidden"><div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-6 focus:outline-none" tabindex="-1"${add_attribute("this", cartDrawerEl, 0)}><div class="pointer-events-auto w-screen max-w-lg max-h-screen bg-white"><div class="flex flex-col min-h-full max-h-screen"><div class="flex items-start justify-between shadow-sm p-5"><h2 class="text-2xl flex gap-4 items-center font-bold text-zinc-800" id="slide-over-title">Your cart
                  ${$isCartUpdating
		? `<svg class="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`
		: ``}</h2>
                <div class="ml-3 flex h-7 items-center"><button type="button" class="-m-2 p-2 text-gray-400 hover:text-gray-500"><span class="sr-only">Close panel</span>
                    
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg></button></div></div>

              <div class="flex-1 overflow-y-scroll"><div class="px-5">${$cart && $cart.lines?.nodes.length > 0
		? `
                    <ul role="list" class="${"divide-y divide-zinc-100 " + escape(cartIsUpdatingClass, true)}">${each($cart.lines?.nodes, item => {
				return `<li class="grid py-8 grid-cols-12 gap-3"><div class="overflow-hidden rounded-lg col-span-3 lg:col-span-2">${validate_component(ShopifyImage, "ShopifyImage").$$render(
					$$result,
					{
						image: item.merchandise.image,
						classList: "object-cover h-full object-center aspect-1",
						sizes: "(min-width: 100px) 100px",
						loading: "lazy"
					},
					{},
					{}
				)}</div>
                          <div class="col-span-7 lg:col-span-8 flex flex-col gap-2"><a class="hover:underline w-fit"${add_attribute("href", `/products/${item.merchandise.product.handle}`, 0)}>${escape(item.merchandise.product.title)}</a>
                            <p class="text-xs">${validate_component(Money, "Money").$$render($$result, { price: item.cost.amountPerQuantity }, {}, {})}
                            </p></div>
                          <div class="col-span-2 items-end flex justify-between flex-col"><button type="button" ${$isCartUpdating ? "disabled" : ""}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"></path></svg></button>
                            <div><p class="font-medium">${validate_component(Money, "Money").$$render($$result, { price: item.cost.totalAmount }, {}, {})}</p>
                            </div></div>
                        </li>`;
			})}</ul>`
		: `<div class="text-center mt-20"><p class="text-gray-500">Your cart is empty</p>
                      <a href="/" class="font-semibold text-emerald-900 hover:text-emerald-700">Continue Shopping
                        <span aria-hidden="true">→</span></a></div>`}</div></div>

              <div class="">${$cart && $cart.lines?.nodes.length > 0
		? `<div class="border-t border-zinc-200 py-6 px-4 sm:px-6"><div class="flex justify-between text-base font-medium text-gray-900"><p>Subtotal</p>
                      <p>${validate_component(Money, "Money").$$render(
				$$result,
				{
					price: $cart.cost.totalAmount,
					showCurrency: true
				},
				{},
				{}
			)}</p></div>
                    <p class="mt-0.5 text-sm text-gray-500">Shipping and taxes calculated at checkout.
                    </p>
                    <div class="mt-6"><a${add_attribute("href", $cart.checkoutUrl, 0)} class="button">Checkout</a></div></div>`
		: ``}</div></div></div></div></div></div></div>`
	: ``}`;
});

const $$Astro$d = createAstro();
const $$AnnouncementBar = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$d, $$props, $$slots);
  Astro2.self = $$AnnouncementBar;
  const message = "\u{1F384} Free delivery for Christmas \u{1F381}";
  return renderTemplate`${maybeRenderHead($$result)}<div class="flex items-center justify-center bg-gradient-to-r from-[#2ca5d5] to-[#e81cff] px-4 py-2 text-sm font-bold text-white sm:px-6 lg:px-8">
  ${message}
</div>`;
}, "/Users/mimecine/Projects/kastro/src/components/AnnouncementBar.astro");

const $$Astro$c = createAstro();
const $$BaseLayout = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$c, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const defaultDesc = "A lightweight and minimalit Astro starter theme using Shopify with Svelte, Tailwind, and TypeScript.";
  const { title, description = defaultDesc } = Astro2.props;
  return renderTemplate`<html lang="en">
  <head>
    <meta charset="utf-8">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <meta name="viewport" content="width=device-width">
    <meta name="generator"${addAttribute(Astro2.generator, "content")}>
    <title>${title}</title>
    <meta name="description"${addAttribute(description, "content")}>
    
  ${renderHead($$result)}</head>
  <body>
    ${renderComponent($$result, "AnnouncementBar", $$AnnouncementBar, {})}
    ${renderComponent($$result, "CartDrawer", CartDrawer, { "client:idle": true, "client:component-hydration": "idle", "client:component-path": "/Users/mimecine/Projects/kastro/src/components/CartDrawer.svelte", "client:component-export": "default" })}
    ${renderComponent($$result, "Header", $$Header, {})}
    <main>
      ${renderSlot($$result, $$slots["default"])}
    </main>
    ${renderComponent($$result, "Footer", $$Footer, {})}
  </body></html>`;
}, "/Users/mimecine/Projects/kastro/src/layouts/BaseLayout.astro");

const $$Astro$b = createAstro();
const $$ProductCard = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$b, $$props, $$slots);
  Astro2.self = $$ProductCard;
  const { product } = Astro2.props;
  return renderTemplate`${maybeRenderHead($$result)}<a${addAttribute(`/products/${product?.handle}`, "href")} class="group overflow-hidden rounded-lg border-l-orange-100 shadow hover:shadow-md">
  <div class="relative">
    ${renderComponent($$result, "ShopifyImage", ShopifyImage, { "classList": "", "loading": "eager", "image": product?.featuredImage, "sizes": `
      (min-width: 1540px) 348px,
      (min-width: 1280px) 284px,
      (min-width: 1040px) 309px,
      (min-width: 780px) 348px,
      (min-width: 640px) 284px,
      calc(100vw - 48px)
    ` })}
    <div class="absolute inset-0 z-10 grid items-end justify-items-center opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
      <button class="button w-full gap-3 rounded-none">
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"></path>
          </svg>
        </span>
        Shop now
      </button>
    </div>
  </div>
  <div class="flex justify-between py-6 px-5 text-zinc-700">
    <h3 class="group-hover:underline">${product?.title}</h3>
    <p class="font-bold">
      ${renderComponent($$result, "Money", Money, { "price": product?.variants.nodes[0].priceV2 })}
    </p>
  </div>
</a>`;
}, "/Users/mimecine/Projects/kastro/src/components/ProductCard.astro");

const $$Astro$a = createAstro();
const $$Products = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$a, $$props, $$slots);
  Astro2.self = $$Products;
  z.array(ProductResult);
  const { products } = Astro2.props;
  return renderTemplate`${maybeRenderHead($$result)}<section>
  <div class="container py-16 sm:py-20">
    <h2 class="sr-only">Products</h2>

    <div class="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
      ${products.map((product) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, { "product": product })}`)}
    </div>
  </div>
</section>`;
}, "/Users/mimecine/Projects/kastro/src/components/Products.astro");

const setCache = {
  long: (Astro) => {
    Astro.response.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120"
    );
  },
  short: (Astro) => {
    Astro.response.headers.set(
      "Cache-Control",
      "public, max-age=1, stale-while-revalidate=9"
    );
  }
};

const $$Astro$9 = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$9, $$props, $$slots);
  Astro2.self = $$Index;
  const title = "Astro + Shopify";
  const headers = Astro2.request.headers;
  const ip = headers.get("x-vercel-forwarded-for") || Astro2.clientAddress;
  const products = await getProducts({ buyerIP: ip });
  setCache.short(Astro2);
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title }, { "default": ($$result2) => renderTemplate`${renderComponent($$result2, "Products", $$Products, { "products": products })}` })}`;
}, "/Users/mimecine/Projects/kastro/src/pages/index.astro");

const $$file$2 = "/Users/mimecine/Projects/kastro/src/pages/index.astro";
const $$url$2 = "";

const _page0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file$2,
  url: $$url$2
}, Symbol.toStringTag, { value: 'Module' }));

const $$Astro$8 = createAstro();
const $$NotFoundLayout = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$8, $$props, $$slots);
  Astro2.self = $$NotFoundLayout;
  Astro2.response.status = 404;
  const defaultTitle = "Page not found";
  const { title = defaultTitle, message = defaultTitle } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title }, { "default": ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<div class="container grid justify-center py-44 text-center">
    <span class="text-6xl font-bold text-emerald-900">404</span>
    <h1 class="mt-4 text-xl">${message}</h1>
    <a href="/" class="mt-6 font-semibold text-emerald-900 hover:text-emerald-700">
      Go back home
      <span aria-hidden="true"> &rarr;</span>
    </a>
  </div>` })}`;
}, "/Users/mimecine/Projects/kastro/src/layouts/NotFoundLayout.astro");

/* src/components/AddToCartForm.svelte generated by Svelte v3.56.0 */

const AddToCartForm = create_ssr_component(($$result, $$props, $$bindings, slots) => {
	let variantInCart;
	let noQuantityLeft;
	let $cart, $$unsubscribe_cart;
	let $isCartUpdating, $$unsubscribe_isCartUpdating;
	$$unsubscribe_cart = subscribe(cart, value => $cart = value);
	$$unsubscribe_isCartUpdating = subscribe(isCartUpdating, value => $isCartUpdating = value);
	let { variantId } = $$props;
	let { variantQuantityAvailable } = $$props;
	let { variantAvailableForSale } = $$props;

	if ($$props.variantId === void 0 && $$bindings.variantId && variantId !== void 0) $$bindings.variantId(variantId);
	if ($$props.variantQuantityAvailable === void 0 && $$bindings.variantQuantityAvailable && variantQuantityAvailable !== void 0) $$bindings.variantQuantityAvailable(variantQuantityAvailable);
	if ($$props.variantAvailableForSale === void 0 && $$bindings.variantAvailableForSale && variantAvailableForSale !== void 0) $$bindings.variantAvailableForSale(variantAvailableForSale);
	variantInCart = $cart && $cart.lines?.nodes.filter(item => item.merchandise.id === variantId)[0];
	noQuantityLeft = variantInCart && variantQuantityAvailable <= variantInCart?.quantity;
	$$unsubscribe_cart();
	$$unsubscribe_isCartUpdating();

	return `<form><input type="hidden" name="id"${add_attribute("value", variantId, 0)}>
  <input type="hidden" name="quantity" value="1">

  <button type="submit" class="button mt-10 w-full" ${$isCartUpdating || noQuantityLeft || !variantAvailableForSale
	? "disabled"
	: ""}>${$isCartUpdating
	? `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`
	: ``}
    ${variantAvailableForSale ? `Add to bag` : `Sold out`}</button>
  ${noQuantityLeft
	? `<div class="text-center text-red-600"><small>All units left are in your cart</small></div>`
	: ``}</form>`;
});

const $$Astro$7 = createAstro();
const $$ProductImageGallery = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$ProductImageGallery;
  z.object({
    nodes: z.array(ImageResult)
  });
  const { images } = Astro2.props;
  return renderTemplate`${maybeRenderHead($$result)}<div class="grid gap-4 md:grid-cols-8 lg:gap-6">
  <div class="md:order-2 md:col-span-6">
    ${renderComponent($$result, "ShopifyImage", ShopifyImage, { "classList": "overflow-hidden rounded-lg h-full object-cover", "loading": "eager", "image": images.nodes[0], "sizes": `
          (min-width: 1540px) 475px,
          (min-width: 1280px) 389px,
          (min-width: 1040px) 304px,
          (min-width: 780px) 720px,
          (min-width: 680px) 592px,
          calc(94.44vw - 31px)
        ` })}
  </div>
  <div${addAttribute([
    "grid",
    "grid-cols-4",
    "gap-4",
    "md:order-1",
    "md:col-span-2",
    "md:flex",
    "md:flex-col",
    "md:gap-6",
    { "md:justify-between": images.nodes.length > 2 }
  ], "class:list")}>
    ${images.nodes.map((image, index) => {
    if (index < 3) {
      return renderTemplate`<div class="overflow-hidden rounded-lg">
              ${renderComponent($$result, "ShopifyImage", ShopifyImage, { "classList": "", "loading": "eager", "image": image, "sizes": `
                  (min-width: 1540px) 475px,
                  (min-width: 1280px) 389px,
                  304px
                ` })}
            </div>`;
    }
  })}
  </div>
</div>`;
}, "/Users/mimecine/Projects/kastro/src/components/ProductImageGallery.astro");

const $$Astro$6 = createAstro();
const $$ProductBreadcrumb = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$ProductBreadcrumb;
  const { title } = Astro2.props;
  return renderTemplate`<!-- This code uses the Breadcrumbs component from HyperUI
(https://www.hyperui.dev/components/application-ui/breadcrumbs#component-1)
Thank you to the HyperUI team for providing this open source component. -->${maybeRenderHead($$result)}<nav aria-label=" Breadcrumb">
  <ol role="list" class="flex items-center gap-1 text-sm text-gray-600">
    <li>
      <a href="/" class="block text-gray-800 transition hover:text-gray-700">
        <span class="sr-only">Home</span>

        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
        </svg>
      </a>
    </li>

    <li>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
      </svg>
    </li>

    <li>
      <div class="block transition hover:text-gray-700">${title}</div>
    </li>
  </ol>
</nav>`;
}, "/Users/mimecine/Projects/kastro/src/components/ProductBreadcrumb.astro");

const $$Astro$5 = createAstro();
const $$ProductInformations = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$ProductInformations;
  const { price, title } = Astro2.props;
  return renderTemplate`${maybeRenderHead($$result)}<h1 class="text-2xl font-bold text-zinc-800 sm:text-4xl">
  ${title}
</h1>
<p class="mt-4 text-3xl font-bold text-emerald-900">
  ${renderComponent($$result, "Money", Money, { "price": price })}
</p>

<!-- Reviews -->
<div class="mt-4">
  <div class="flex items-center gap-4">
    <div class="flex">
      <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
      <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
      <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
      <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
      <svg class="h-5 w-5 text-gray-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
      </svg>
    </div>
    <a href="#reviews" class="text-sm text-emerald-900 hover:underline">42 Reviews</a>
  </div>
  <div class="mt-6">
    <p class="text-base text-zinc-900">
      This store is for demo purposes only. No orders will be fulfilled. Please
      visit the brand's <a class="text-emerald-900 underline" href="https://www.lateafternoons.ca" target="_blank" rel="noopener noreferer">website</a> to purchase this product.
    </p>
  </div>
</div>`;
}, "/Users/mimecine/Projects/kastro/src/components/ProductInformations.astro");

const $$Astro$4 = createAstro();
const $$ProductRecommendations = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$ProductRecommendations;
  const { productId, buyerIP } = Astro2.props;
  const productRecommendations = await getProductRecommendations({
    productId,
    buyerIP
  });
  return renderTemplate`${productRecommendations.length > 0 && renderTemplate`${maybeRenderHead($$result)}<section class="bg-white">
      <div class="py-16 sm:py-24">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900">
          Customers also purchased
        </h2>

        <div class="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          ${productRecommendations.map((product) => renderTemplate`${renderComponent($$result, "ProductCard", $$ProductCard, { "product": product })}`)}
        </div>
      </div>
    </section>`}`;
}, "/Users/mimecine/Projects/kastro/src/components/ProductRecommendations.astro");

const $$Astro$3 = createAstro();
const $$ProductReviews = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$ProductReviews;
  return renderTemplate`<!-- This code uses the Reviews component from HyperUI
(https://www.hyperui.dev/components/ecommerce/reviews#component-1)
Thank you to the HyperUI team for providing this open source component. -->${maybeRenderHead($$result)}<div class="mt-10 mb-20 scroll-mt-20" id="reviews">
  <h2 class="text-xl font-bold sm:text-2xl">Customer Reviews</h2>

  <div class="mt-4 flex items-center gap-4">
    <p class="text-3xl font-medium">
      3.8
      <span class="sr-only"> Average review score</span>
    </p>

    <div>
      <div class="flex">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
      </div>

      <p class="mt-0.5 text-xs text-gray-500">Based on 42 reviews</p>
    </div>
  </div>

  <div class="mt-8 grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-2">
    <blockquote>
      <header class="sm:flex sm:items-center sm:gap-4">
        <div class="flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
        </div>

        <p class="mt-2 font-medium sm:mt-0">The best thing money can buy!</p>
      </header>

      <p class="mt-2 text-gray-700">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ullam possimus
        fuga dolor rerum dicta, ipsum laboriosam est totam iusto alias incidunt
        cum tempore aliquid aliquam error quisquam ipsam asperiores! Iste?
      </p>

      <footer class="mt-4">
        <p class="text-xs text-gray-500">John Doe - 12th January, 2024</p>
      </footer>
    </blockquote>

    <blockquote>
      <header class="sm:flex sm:items-center sm:gap-4">
        <div class="flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
        </div>

        <p class="mt-2 font-medium sm:mt-0">The best thing money can buy!</p>
      </header>

      <p class="mt-2 text-gray-700">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ullam possimus
        fuga dolor rerum dicta, ipsum laboriosam est totam iusto alias incidunt
        cum tempore aliquid aliquam error quisquam ipsam asperiores! Iste?
      </p>

      <footer class="mt-4">
        <p class="text-xs text-gray-500">John Doe - 12th January, 2024</p>
      </footer>
    </blockquote>

    <blockquote>
      <header class="sm:flex sm:items-center sm:gap-4">
        <div class="flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
        </div>

        <p class="mt-2 font-medium sm:mt-0">The best thing money can buy!</p>
      </header>

      <p class="mt-2 text-gray-700">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ullam possimus
        fuga dolor rerum dicta, ipsum laboriosam est totam iusto alias incidunt
        cum tempore aliquid aliquam error quisquam ipsam asperiores! Iste?
      </p>

      <footer class="mt-4">
        <p class="text-xs text-gray-500">John Doe - 12th January, 2024</p>
      </footer>
    </blockquote>

    <blockquote>
      <header class="sm:flex sm:items-center sm:gap-4">
        <div class="flex">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
        </div>

        <p class="mt-2 font-medium sm:mt-0">The best thing money can buy!</p>
      </header>

      <p class="mt-2 text-gray-700">
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ullam possimus
        fuga dolor rerum dicta, ipsum laboriosam est totam iusto alias incidunt
        cum tempore aliquid aliquam error quisquam ipsam asperiores! Iste?
      </p>

      <footer class="mt-4">
        <p class="text-xs text-gray-500">John Doe - 12th January, 2024</p>
      </footer>
    </blockquote>
  </div>
</div>`;
}, "/Users/mimecine/Projects/kastro/src/components/ProductReviews.astro");

const $$Astro$2 = createAstro();
const $$ProductAccordions = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$ProductAccordions;
  const accordions = [
    {
      title: "Shipping",
      icon: "truck",
      content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ullam possimus fuga dolor rerum dicta, ipsum laboriosam est totam iusto alias incidunt cum tempore aliquid aliquam error quisquam ipsam asperiores! Iste?"
    },
    {
      title: "Care instructions",
      icon: "care",
      content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ullam possimus fuga dolor rerum dicta, ipsum laboriosam est totam iusto alias incidunt cum tempore aliquid aliquam error quisquam ipsam asperiores! Iste?"
    }
  ];
  return renderTemplate`${maybeRenderHead($$result)}<div class="grid">
  ${accordions.map((accordion, index) => renderTemplate`<details${addAttribute([
    "group",
    "border-t",
    { "border-b": index === accordions.length - 1 }
  ], "class:list")}>
        <summary class="flex cursor-pointer items-center justify-between py-3 px-1 font-bold text-zinc-700">
          <div class="flex items-center gap-2">
            ${accordion.icon === "truck" && renderTemplate`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"></path>
              </svg>`}
            ${accordion.icon === "care" && renderTemplate`<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-5 w-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"></path>
              </svg>`}
            ${accordion.title}
          </div>
          <span class="transition group-open:rotate-180">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-4 w-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"></path>
            </svg>
          </span>
        </summary>
        <div class="p-4 text-sm text-zinc-600">${accordion.content}</div>
      </details>`)}
</div>`;
}, "/Users/mimecine/Projects/kastro/src/components/ProductAccordions.astro");

const $$Astro$1 = createAstro();
const $$ = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$;
  const { handle } = Astro2.params;
  const headers = Astro2.request.headers;
  const ip = headers.get("x-vercel-forwarded-for") || Astro2.clientAddress;
  const product = await getProductByHandle({ handle: handle || "", buyerIP: ip });
  if (!product) {
    Astro2.response.status = 404;
  }
  const firstVariant = product?.variants.nodes[0];
  setCache.short(Astro2);
  return renderTemplate`${!product ? renderTemplate`${renderComponent($$result, "NotFoundLayout", $$NotFoundLayout, { "title": "Product not found", "message": "Product not found" })}` : renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": product.title }, { "default": ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<div class="container pt-6">
        ${renderComponent($$result2, "ProductBreadcrumb", $$ProductBreadcrumb, { "title": product.title })}
      </div><section class="container">
        <div class="pb-16 pt-6 lg:grid lg:grid-cols-12 lg:gap-20">
          <div class="lg:col-span-7">
            ${renderComponent($$result2, "ProductImageGallery", $$ProductImageGallery, { "images": product.images })}
          </div>

          <div class="mt-8 lg:col-span-5 lg:mt-0">
            ${renderComponent($$result2, "ProductInformations", $$ProductInformations, { "title": product.title, "price": firstVariant?.priceV2 })}

            <div>
              ${renderComponent($$result2, "AddToCartForm", AddToCartForm, { "client:load": true, "variantId": firstVariant?.id, "variantQuantityAvailable": firstVariant?.quantityAvailable, "variantAvailableForSale": firstVariant?.availableForSale, "client:component-hydration": "load", "client:component-path": "/Users/mimecine/Projects/kastro/src/components/AddToCartForm.svelte", "client:component-export": "default" })}
            </div>

            <div class="mt-8">
              ${renderComponent($$result2, "ProductAccordions", $$ProductAccordions, {})}
            </div>
          </div>
        </div>
      </section><section class="container">
        ${renderComponent($$result2, "ProductReviews", $$ProductReviews, {})}
      </section><section class="container">
        ${renderComponent($$result2, "ProductRecommendations", $$ProductRecommendations, { "productId": product.id, "buyerIP": ip })}
      </section>` })}`}`;
}, "/Users/mimecine/Projects/kastro/src/pages/products/[...handle].astro");

const $$file$1 = "/Users/mimecine/Projects/kastro/src/pages/products/[...handle].astro";
const $$url$1 = "/products/[...handle]";

const _page1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$,
  file: $$file$1,
  url: $$url$1
}, Symbol.toStringTag, { value: 'Module' }));

const $$Astro = createAstro();
const $$404 = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$404;
  Astro2.response.status = 404;
  return renderTemplate`${renderComponent($$result, "NotFoundLayout", $$NotFoundLayout, {})}`;
}, "/Users/mimecine/Projects/kastro/src/pages/404.astro");

const $$file = "/Users/mimecine/Projects/kastro/src/pages/404.astro";
const $$url = "/404";

const _page2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

export { _page0 as _, _page1 as a, _page2 as b };
