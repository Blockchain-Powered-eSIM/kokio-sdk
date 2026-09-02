const PaymentAdapter = [
    {
        "type": "function",
        "name": "UPGRADE_INTERFACE_VERSION",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "acceptOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "assets",
        "inputs": [
            {
                "name": "symbol",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "allowed",
                "type": "bool",
                "internalType": "bool"
            },
            {
                "name": "isDollarUnit",
                "type": "bool",
                "internalType": "bool"
            },
            {
                "name": "decimals",
                "type": "uint8",
                "internalType": "uint8"
            },
            {
                "name": "token",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "consumePaymentReference",
        "inputs": [
            {
                "name": "_paymentReference",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "initialize",
        "inputs": [
            {
                "name": "_registry",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_settlementToken",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_upgradeManager",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "pendingOwner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "proxiableUUID",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "quote",
        "inputs": [
            {
                "name": "_symbol",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "_priceUSDCents",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "outputs": [
            {
                "name": "amountIn",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "registerAsset",
        "inputs": [
            {
                "name": "_symbol",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "_asset",
                "type": "tuple",
                "internalType": "struct Asset",
                "components": [
                    {
                        "name": "allowed",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isDollarUnit",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "decimals",
                        "type": "uint8",
                        "internalType": "uint8"
                    },
                    {
                        "name": "token",
                        "type": "address",
                        "internalType": "address"
                    }
                ]
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "registry",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "pure"
    },
    {
        "type": "function",
        "name": "resolveAsset",
        "inputs": [
            {
                "name": "_symbol",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct Asset",
                "components": [
                    {
                        "name": "allowed",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isDollarUnit",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "decimals",
                        "type": "uint8",
                        "internalType": "uint8"
                    },
                    {
                        "name": "token",
                        "type": "address",
                        "internalType": "address"
                    }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "settle",
        "inputs": [
            {
                "name": "_symbol",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "_priceUSDCents",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "_amountIn",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_refundTo",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "spent",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "refunded",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "settlementToken",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "updateAsset",
        "inputs": [
            {
                "name": "_symbol",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "_asset",
                "type": "tuple",
                "internalType": "struct Asset",
                "components": [
                    {
                        "name": "allowed",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "isDollarUnit",
                        "type": "bool",
                        "internalType": "bool"
                    },
                    {
                        "name": "decimals",
                        "type": "uint8",
                        "internalType": "uint8"
                    },
                    {
                        "name": "token",
                        "type": "address",
                        "internalType": "address"
                    }
                ]
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "upgradeManager",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "upgradeToAndCall",
        "inputs": [
            {
                "name": "newImplementation",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "usedReferences",
        "inputs": [
            {
                "name": "paymentReference",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "used",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "AssetUpdated",
        "inputs": [
            {
                "name": "_symbol",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "_allowed",
                "type": "bool",
                "indexed": false,
                "internalType": "bool"
            },
            {
                "name": "_isDollarUnit",
                "type": "bool",
                "indexed": false,
                "internalType": "bool"
            },
            {
                "name": "_decimals",
                "type": "uint8",
                "indexed": false,
                "internalType": "uint8"
            },
            {
                "name": "_token",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Initialized",
        "inputs": [
            {
                "name": "version",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferStarted",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PaymentAdapterInitialized",
        "inputs": [
            {
                "name": "_registry",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_settlementToken",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PaymentReferenceConsumed",
        "inputs": [
            {
                "name": "_paymentReference",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PaymentSettled",
        "inputs": [
            {
                "name": "_symbol",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "_eSIMWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_vault",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_priceUSDCents",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            },
            {
                "name": "_spent",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "_refunded",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Upgraded",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "AddressEmptyCode",
        "inputs": [
            {
                "name": "target",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "AssetAlreadyRegistered",
        "inputs": [
            {
                "name": "asset",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "AssetDecimalsTooHigh",
        "inputs": [
            {
                "name": "asset",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "decimals",
                "type": "uint8",
                "internalType": "uint8"
            }
        ]
    },
    {
        "type": "error",
        "name": "AssetDecimalsTooLow",
        "inputs": [
            {
                "name": "asset",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "decimals",
                "type": "uint8",
                "internalType": "uint8"
            }
        ]
    },
    {
        "type": "error",
        "name": "AssetNeedsSwap",
        "inputs": [
            {
                "name": "asset",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "AssetNotAllowed",
        "inputs": [
            {
                "name": "asset",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "AssetNotRegistered",
        "inputs": [
            {
                "name": "asset",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "AssetNotTransferable",
        "inputs": [
            {
                "name": "asset",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC1967InvalidImplementation",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC1967NonPayable",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyAssetSymbol",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyPaymentReference",
        "inputs": []
    },
    {
        "type": "error",
        "name": "FailedCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidInitialization",
        "inputs": []
    },
    {
        "type": "error",
        "name": "NotAProtocolESIMWallet",
        "inputs": [
            {
                "name": "eSIMWallet",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "NotInitializing",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyRegistry",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnershipCannotBeRenounced",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PaymentReferenceAlreadyUsed",
        "inputs": [
            {
                "name": "paymentReference",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "ReentrancyGuardReentrantCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SafeERC20FailedOperation",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "SettlementAboveMax",
        "inputs": [
            {
                "name": "required",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "maxAmountIn",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "SettlementNotFunded",
        "inputs": [
            {
                "name": "amountIn",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "balance",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "UUPSUnauthorizedCallContext",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UUPSUnsupportedProxiableUUID",
        "inputs": [
            {
                "name": "slot",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "ZeroAddress",
        "inputs": [
            {
                "name": "parameter",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "ZeroDataBundlePrice",
        "inputs": []
    }
] as const;

export default PaymentAdapter;
