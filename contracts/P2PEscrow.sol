// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract P2PFiatToFiatEscrow {
    address public admin;
    IERC20 public usdtToken;
    enum OrderState { CREATED, FUNDED, COMPLETED, DISPUTED }

    struct Order {
        address localMerchant;
        address foreignMerchant;
        uint256 usdtAmount;
        OrderState state;
    }

    mapping(uint256 => Order) public orders;

    constructor(address _usdtAddress) {
        admin = msg.sender;
        usdtToken = IERC20(_usdtAddress);
    }

    function fundOrder(uint256 _orderId, uint256 _amount, address _foreignMerchant) external {
        require(usdtToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        orders[_orderId] = Order(msg.sender, _foreignMerchant, _amount, OrderState.FUNDED);
    }

    function releaseUSDT(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(order.state == OrderState.FUNDED, "Order is not funded");
        require(msg.sender == admin || msg.sender == order.localMerchant, "Not authorized");
        order.state = OrderState.COMPLETED;
        require(usdtToken.transfer(order.foreignMerchant, order.usdtAmount), "Transfer failed");
    }
}
