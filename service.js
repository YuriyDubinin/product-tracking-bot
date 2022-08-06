// Модуль обеспечивающий подключение к базе данных

const mysql = require("mysql");

// функция устанавливающая подключение к базе данных
function setUpConnection() {
    // настройка подключения к базе данных
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "root",
        database: "catalog_db",
    });

    // логгирование при подключении к базе данных
    connection.connect((error) => {
        if (error) {
            console.log("No database connection");
            throw error;
        }

        console.log("Database connected");
    });

    return connection;
}

module.exports.setUpConnection = setUpConnection;
