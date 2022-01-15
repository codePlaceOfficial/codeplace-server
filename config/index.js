const server = {
    port: 80
}

const dev = {
    port:2999
}

module.exports = process.env.NODE_ENV === "development"  ? dev : server