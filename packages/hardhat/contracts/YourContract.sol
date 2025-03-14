// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;


contract DailyGM {
    /// @notice Mapping to track each user's last GM timestamp
    mapping(address user => uint256 lastGM) public lastGM;

    /// @notice Event emitted when a new GM is recorded
    event GM(address indexed user, address indexed recipient);

    /// @notice Function to say GM
    /// @dev Used to record a GM for the caller
    /// @dev Recipient set to address zero, since GM is not for a specific user
    /// @dev Ensures caller can only GM once a day
    function gm() external {
        _checkDailyLimit();

        lastGM[msg.sender] = block.timestamp;

        emit GM(msg.sender, address(0));
    }

    function gmTo(address recipient) external {
        if (recipient == msg.sender) {
            revert();
        }

        _checkDailyLimit();

        lastGM[msg.sender] = block.timestamp;

        emit GM(msg.sender, recipient);
    }

    /// @dev Private function to check if caller has already GMed within the last 24 hours
    /// @dev Reverts if caller has already GMed
    function _checkDailyLimit() private view {
        if (block.timestamp < lastGM[msg.sender] + 1 days) {
            revert();
        }
    }
}
