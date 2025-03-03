const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const packageJSON = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const entry = './src/waterpipe.js';
const code = fs.readFileSync(entry, 'utf8').replace(/\d+\.\d+\.\d+/, packageJSON.version);
fs.writeFileSync(entry, code, 'utf8');

module.exports = {
    entry: {
        'waterpipe': entry,
        'waterpipe.min': entry,
    },
    mode: 'production',
    devtool: 'source-map',
    output: {
        path: path.join(process.cwd(), 'dist'),
        filename: '[name].js',
        library: 'waterpipe',
        libraryTarget: 'umd',
        libraryExport: 'default',
        globalObject: 'this',
        umdNamedDefine: true
    },
    plugins: [
        new webpack.BannerPlugin({
            banner: `${packageJSON.name} v${packageJSON.version} | (c) ${packageJSON.author} | ${packageJSON.homepage}`
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                test: /\.min\.js$/i,
                extractComments: false,
                terserOptions: {
                    format: {
                        comments: 'some'
                    }
                }
            })
        ]
    }
};
