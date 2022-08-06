// Модуль содержит функции с помощью которых формируются различные списки товаров

// формирование полного списка товаров
function createListOfAllProducts(store) {
    let totalStr = `Информация о всех позициях 📦:\n\n`;

    // формирование сообщения в чат
    store.forEach((storeItem) => {
        let sizeDataStr = ``;
        storeItem.sizeData.forEach((sizeDataItem) => {
            sizeDataStr += `${sizeDataItem.size} - заказали - ${sizeDataItem.maxSpeedIn14d} шт. / остаток на WB - ${sizeDataItem.leftInWbStock} шт. / остаток на ${sizeDataItem.enoughForDays} дней\n`;
        });

        totalStr += `${storeItem.vendorCode} - ${storeItem.name}\nЦена: ${storeItem.price} р.\nРазмеры заказанные за 14 дней: \n${sizeDataStr}\n`;
    });

    return totalStr;
}

// формирование списка недостоющих товаров
function createListOfMissingProducts(store) {
    const limitQuantity = 14;
    let totalStr = `Информация о позициях необходимых для заказа 📉:\n\n`;

    let missingProductsList = [];

    // первичное заполение missingProductList
    store.forEach((storeItem) => {
        missingProductsList.push({
            vendorCode: storeItem.vendorCode,
            name: storeItem.name,
            sizeType: storeItem.sizeType,
            price: storeItem.price,
            sizeData: [],
        });
    });

    // вторичное заполнение missingProductList товарами небходимых размеров
    missingProductsList.forEach((missingItem) => {
        store.forEach((storeItem) => {
            if (missingItem.vendorCode === storeItem.vendorCode) {
                storeItem.sizeData.forEach((storeSizeDataItem) => {
                    if (storeSizeDataItem.enoughForDays < limitQuantity) {
                        missingItem.sizeData.push(storeSizeDataItem);
                    }
                });
            }
        });
    });

    // формирование конечного списка missingProductList с актуальными размерами
    missingProductsList = missingProductsList.filter((item) => {
        if (item.sizeData.length !== 0) {
            return item;
        }
    });

    // формирование сообщения в чат + проверка на пустоту
    if (missingProductsList.length != 0) {
        missingProductsList.forEach((missingProductListItem) => {
            let sizeDataStr = ``;
            missingProductListItem.sizeData.forEach((sizeDataItem) => {
                sizeDataStr += `${sizeDataItem.size} - заказали - ${sizeDataItem.maxSpeedIn14d} шт. / остаток на WB - ${sizeDataItem.leftInWbStock} шт. / остаток на ${sizeDataItem.enoughForDays} дней\n`;
            });

            totalStr += `${missingProductListItem.vendorCode} - ${missingProductListItem.name}\nЦена: ${missingProductListItem.price} р.\nРазмеры заказанные за 14 дней: \n${sizeDataStr}\n`;
        });
    } else {
        totalStr += "*Список пуст*";
    }

    return totalStr;
}

module.exports.createListOfAllProducts = createListOfAllProducts;
module.exports.createListOfMissingProducts = createListOfMissingProducts;
