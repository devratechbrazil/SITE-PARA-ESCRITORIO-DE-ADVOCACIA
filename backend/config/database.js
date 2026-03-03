const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI nao definida no arquivo .env');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Erro ao conectar MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
