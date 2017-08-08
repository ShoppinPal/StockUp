module.exports = {
    "env": {
        "node": true,
        "commonjs": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "no-empty": [
            "warn"
        ],
        "no-unused-vars": [
            "warn"
        ],
        "no-console": [
            "warn"
        ],
        "no-redeclare": [
            "warn"
        ],
        "no-undef": [
            "warn"
        ],
        "indent": [
            "warn",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "warn",
            "single"
        ],
        "semi": [
            "warn",
            "always"
        ],
        "func-names": [
            "error",
            "always"
        ]
    }
};