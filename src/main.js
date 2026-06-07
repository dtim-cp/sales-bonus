/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // purchase — это одна из записей в поле items из чека в data.purchase_records
    // _product — это продукт из коллекции data.products
    const { discount, sale_price, quantity } = purchase;
    const discountDecimal = discount ? discount / 100 : 0;
    const fullCost = sale_price * quantity;
    const revenue = fullCost * (1 - discountDecimal);

    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (typeof options !== 'object' || options === null
    ) {
        throw new Error('Опции должны быть объектом');
    }

    const { calculateSimpleRevenue, calculateBonusByProfit } = options;

    if (!calculateSimpleRevenue || !calculateBonusByProfit) {
        throw new Error('Чего-то не хватает');
    }

    if (typeof calculateSimpleRevenue !== 'function') {
        throw new Error('calculateSimpleRevenue должен быть функцией');
    }
    if (typeof calculateBonusByProfit !== 'function') {
        throw new Error('calculateBonusByProfit должен быть функцией');
    }

    if (!data
        || !data.customers
        || !data.products
        || !data.sellers
        || !data.purchase_records
    ) {
        throw new Error('Некорректные входные данные');
    }

    if (!Array.isArray(data.sellers)
        || !Array.isArray(data.customers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
    ) {
        throw new Error('Некорректные входные данные, поля должны быть массивами');
    }

    if (data.sellers.length === 0
        || data.products.length === 0
        || data.customers.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные, массивы не могут быть пустыми');
    }

    // Здесь посчитаем промежуточные данные и отсортируем продавцов
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller]));

    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const cost = product.purchase_price * item.quantity;
            const revenue = calculateSimpleRevenue(item, product);
            const profit = revenue - cost;
            seller.profit += profit;
            seller.revenue += revenue;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    sellerStats.sort((a, b) => b.profit - a.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}