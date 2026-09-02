const Registry = [
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
        "name": "acceptAdminUpdate",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
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
        "name": "addOrUpdateLazyWalletRegistryAddress",
        "inputs": [
            {
                "name": "_lazyWalletRegistry",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "adminDisabled",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "adminOfRecord",
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
        "name": "assignESIMIdentifier",
        "inputs": [
            {
                "name": "_eSIMWalletAddress",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "bindESIMWallet",
        "inputs": [
            {
                "name": "_eSIMWalletAddress",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_deviceWalletAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "claimedESIMIdentifiers",
        "inputs": [
            {
                "name": "hashOfESIMIdentifier",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "eSIMWallet",
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
        "name": "defaultPriceCapUSDCents",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "deployLazyWallet",
        "inputs": [
            {
                "name": "_deviceWalletOwnerKey",
                "type": "bytes32[2]",
                "internalType": "bytes32[2]"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_salt",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_eSIMUniqueIdentifiers",
                "type": "string[]",
                "internalType": "string[]"
            },
            {
                "name": "_depositAmount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "address[]",
                "internalType": "address[]"
            }
        ],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "deployMoreLazyESIMWallets",
        "inputs": [
            {
                "name": "_deviceWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_baseSalt",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_startIndex",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_eSIMUniqueIdentifiers",
                "type": "string[]",
                "internalType": "string[]"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address[]",
                "internalType": "address[]"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "deviceWalletFactory",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract DeviceWalletFactory"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "deviceWalletToOwner",
        "inputs": [
            {
                "name": "deviceWalletAddress",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "ownerP256Keys",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "disableAdmin",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "eSIMWalletAdmin",
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
        "name": "eSIMWalletFactory",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract ESIMWalletFactory"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "eSIMWalletForIdentifier",
        "inputs": [
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
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
        "name": "enableAdmin",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "entryPoint",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract IEntryPoint"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initialize",
        "inputs": [
            {
                "name": "_eSIMWalletAdmin",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_vault",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_upgradeManager",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_deviceWalletFactory",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_eSIMWalletFactory",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_entryPoint",
                "type": "address",
                "internalType": "contract IEntryPoint"
            },
            {
                "name": "_defaultPriceCapUSDCents",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "isDeviceIdentifierAlreadyUsed",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isDeviceWalletValid",
        "inputs": [
            {
                "name": "deviceWalletAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "valid",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isESIMIdentifierClaimed",
        "inputs": [
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isESIMWalletOnStandby",
        "inputs": [
            {
                "name": "eSIMWalletAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "isOnStandby",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isESIMWalletValid",
        "inputs": [
            {
                "name": "eSIMWalletAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "deviceWalletAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "lazyWalletRegistry",
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
        "name": "newRequestedAdmin",
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
        "name": "pause",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "paused",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "paymentAdapter",
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
        "name": "populateLazyHistory",
        "inputs": [
            {
                "name": "_eSIMWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_dataBundleDetails",
                "type": "tuple[]",
                "internalType": "struct DataBundleDetails[]",
                "components": [
                    {
                        "name": "id",
                        "type": "bytes32",
                        "internalType": "bytes32"
                    },
                    {
                        "name": "priceUSDCents",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "settlement",
                        "type": "uint8",
                        "internalType": "enum Settlement"
                    }
                ]
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
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
        "name": "recordSettledPurchase",
        "inputs": [
            {
                "name": "_eSIMWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_dataBundleDetail",
                "type": "tuple",
                "internalType": "struct DataBundleDetails",
                "components": [
                    {
                        "name": "id",
                        "type": "bytes32",
                        "internalType": "bytes32"
                    },
                    {
                        "name": "priceUSDCents",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "settlement",
                        "type": "uint8",
                        "internalType": "enum Settlement"
                    }
                ]
            },
            {
                "name": "_asset",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "_tokenAmount",
                "type": "uint256",
                "internalType": "uint256"
            },
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
        "name": "registeredP256Keys",
        "inputs": [
            {
                "name": "hashOfOwnerP256Keys",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "deviceWalletAddress",
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
        "name": "requestAdminUpdate",
        "inputs": [
            {
                "name": "_newAdmin",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "requireDeviceIdentifierNotReserved",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "requireLazyHistoryCopied",
        "inputs": [
            {
                "name": "_eSIMWallet",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "requireNotPaused",
        "inputs": [],
        "outputs": [],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "setDefaultPriceCapUSDCents",
        "inputs": [
            {
                "name": "_cap",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setPaymentAdapter",
        "inputs": [
            {
                "name": "_paymentAdapter",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "toggleESIMWalletStandbyStatus",
        "inputs": [
            {
                "name": "_eSIMWalletAddress",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_isOnStandby",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
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
        "name": "uniqueIdentifierToDeviceWallet",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "deviceWalletAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "unpause",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "updateDeviceWalletInfo",
        "inputs": [
            {
                "name": "_deviceWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_deviceWalletOwnerKey",
                "type": "bytes32[2]",
                "internalType": "bytes32[2]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "updateDeviceWalletOwnerKey",
        "inputs": [
            {
                "name": "_newOwnerKey",
                "type": "bytes32[2]",
                "internalType": "bytes32[2]"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "updateVaultAddress",
        "inputs": [
            {
                "name": "_newVaultAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
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
        "name": "usedPaymentReferences",
        "inputs": [
            {
                "name": "scopedReference",
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
        "type": "function",
        "name": "vault",
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
        "type": "event",
        "name": "AdminDisabled",
        "inputs": [
            {
                "name": "_adminOfRecord",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_caller",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "AdminEnabled",
        "inputs": [
            {
                "name": "_adminOfRecord",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_caller",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "AdminUpdateRequested",
        "inputs": [
            {
                "name": "eSIMWalletAdmin",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_newAdmin",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "AdminUpdateRevoked",
        "inputs": [
            {
                "name": "_caller",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_revokedAddress",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "AdminUpdated",
        "inputs": [
            {
                "name": "_newAdmin",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DataBundleSettled",
        "inputs": [
            {
                "name": "_eSIMWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_dataBundleID",
                "type": "bytes32",
                "indexed": false,
                "internalType": "bytes32"
            },
            {
                "name": "_priceUSDCents",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            },
            {
                "name": "_settlement",
                "type": "uint8",
                "indexed": false,
                "internalType": "enum Settlement"
            },
            {
                "name": "_asset",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "_token",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "_tokenAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
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
        "name": "DefaultPriceCapUSDCentsUpdated",
        "inputs": [
            {
                "name": "_cap",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DeviceWalletInfoUpdated",
        "inputs": [
            {
                "name": "_deviceWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_deviceWalletOwnerKey",
                "type": "bytes32[2]",
                "indexed": false,
                "internalType": "bytes32[2]"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DeviceWalletOwnerKeyUpdated",
        "inputs": [
            {
                "name": "_deviceWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_oldOwnerKey",
                "type": "bytes32[2]",
                "indexed": false,
                "internalType": "bytes32[2]"
            },
            {
                "name": "_newOwnerKey",
                "type": "bytes32[2]",
                "indexed": false,
                "internalType": "bytes32[2]"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ESIMIdentifierClaimed",
        "inputs": [
            {
                "name": "_hashOfESIMIdentifier",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ESIMWalletSetOnStandby",
        "inputs": [
            {
                "name": "_eSIMWalletAddress",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_isOnStandby",
                "type": "bool",
                "indexed": false,
                "internalType": "bool"
            },
            {
                "name": "_deviceWalletAddress",
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
        "name": "LazyWalletDeployed",
        "inputs": [
            {
                "name": "_deviceWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
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
        "name": "Paused",
        "inputs": [
            {
                "name": "_admin",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PaymentAdapterUpdated",
        "inputs": [
            {
                "name": "_paymentAdapter",
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
                "name": "_eSIMWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
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
        "name": "RegistryInitialized",
        "inputs": [
            {
                "name": "_eSIMWalletAdmin",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "_vault",
                "type": "address",
                "indexed": false,
                "internalType": "address"
            },
            {
                "name": "_upgradeManager",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceWalletFactory",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_eSIMWalletFactory",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Unpaused",
        "inputs": [
            {
                "name": "_owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "UpdatedDeviceWalletAssociatedWithESIMWallet",
        "inputs": [
            {
                "name": "_eSIMWalletAddress",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceWalletAddress",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "UpdatedLazyWalletRegistryAddress",
        "inputs": [
            {
                "name": "_lazyWalletRegistry",
                "type": "address",
                "indexed": true,
                "internalType": "address"
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
        "type": "event",
        "name": "VaultAddressUpdated",
        "inputs": [
            {
                "name": "_updatedVaultAddress",
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
        "name": "AdminAlreadyDisabled",
        "inputs": []
    },
    {
        "type": "error",
        "name": "AdminNotDisabled",
        "inputs": []
    },
    {
        "type": "error",
        "name": "DeviceIdentifierAlreadyRegistered",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "DeviceIdentifierReservedForLazyWallet",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "DeviceWalletAlreadyExists",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "deviceWallet",
                "type": "address",
                "internalType": "address"
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
        "name": "ESIMIdentifierAlreadyClaimed",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "eSIMWallet",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ESIMIdentifierReservedForLazyWallet",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "ESIMWalletOwnershipTransferPending",
        "inputs": [
            {
                "name": "eSIMWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "newRequestedOwner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "EmptyDataBundleID",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyESIMIdentifier",
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
        "name": "HistoryNotFullyCopied",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "outstanding",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "InvalidInitialization",
        "inputs": []
    },
    {
        "type": "error",
        "name": "NotADeviceWallet",
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
        "name": "NotTheAssociatedDeviceWallet",
        "inputs": [
            {
                "name": "eSIMWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "associatedDeviceWallet",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "NotTheESIMWalletOwnerOrItsDeviceWallet",
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
        "name": "OnlyAdmin",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyDeviceWallet",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyDeviceWalletFactory",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyLazyWalletRegistry",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyRequestedAdmin",
        "inputs": [
            {
                "name": "requestedAdmin",
                "type": "address",
                "internalType": "address"
            }
        ]
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
        "name": "OwnerKeyAlreadyRegistered",
        "inputs": [
            {
                "name": "ownerKeyHash",
                "type": "bytes32",
                "internalType": "bytes32"
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
        "name": "PaymentAdapterNotSet",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PaymentAdapterUnchanged",
        "inputs": [
            {
                "name": "paymentAdapter",
                "type": "address",
                "internalType": "address"
            }
        ]
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
        "name": "ProtocolPaused",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SettlementNotAsserted",
        "inputs": []
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
        "name": "UnknownESIMWallet",
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
        "name": "VaultUnchanged",
        "inputs": [
            {
                "name": "vault",
                "type": "address",
                "internalType": "address"
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
    },
    {
        "type": "error",
        "name": "ZeroDataBundlePriceCap",
        "inputs": []
    }
] as const;

export default Registry;
