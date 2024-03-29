pragma solidity =0.5.16;

//Functions for retrieving min and Max in 51 length array (requestQ)
//Taken partly from: https://github.com/modular-network/ethereum-libraries-array-utils/blob/master/contracts/Array256Lib.sol

library Utilities {
    /// @dev Returns the minimum value and position in an array.
    //@note IT IGNORES THE 0 INDEX
    function getMin(uint256[51] memory arr)
        internal
        pure
        returns (uint256 min, uint256 minIndex)
    {
        assembly {
            minIndex := 50
            min := mload(add(arr, mul(minIndex, 0x20)))
            for {
                let i := 49
            } gt(i, 0) {
                i := sub(i, 1)
            } {
                let item := mload(add(arr, mul(i, 0x20)))
                if lt(item, min) {
                    min := item
                    minIndex := i
                }
            }
        }
    }

    // function getMin(uint[51] memory data) internal pure returns(uint256 minimal,uint minIndex) {
    //       minIndex = data.length - 1;
    //       minimal = data[minIndex];
    //       for(uint i = data.length-1;i > 0;i--) {
    //           if(data[i] < minimal) {
    //               minimal = data[i];
    //               minIndex = i;
    //           }
    //       }
    // }

    function getMax(uint256[51] memory arr)
        internal
        pure
        returns (uint256 max, uint256 maxIndex)
    {
        assembly {
            for {
                let i := 0
            } lt(i, 51) {
                i := add(i, 1)
            } {
                let item := mload(add(arr, mul(i, 0x20)))
                if lt(max, item) {
                    max := item
                    maxIndex := i
                }
            }
        }
    }
}
