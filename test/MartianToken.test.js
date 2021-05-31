const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const MartianToken = artifacts.require('MartianToken');

contract('MartianToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.martian = await MartianToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.martian.owner()), owner);
        assert.equal((await this.martian.operator()), owner);

        await expectRevert(this.martian.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.martian.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.martian.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.martian.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.martian.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.martian.updateMartianSwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.martian.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.martian.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.martian.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        await expectRevert(this.martian.transferOperator(this.zeroAddress, { from: operator }), 'PANTHER::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        assert.equal((await this.martian.transferTaxRate()).toString(), '500');
        assert.equal((await this.martian.burnRate()).toString(), '20');

        await this.martian.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.martian.transferTaxRate()).toString(), '0');
        await this.martian.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.martian.transferTaxRate()).toString(), '1000');
        await expectRevert(this.martian.updateTransferTaxRate(1001, { from: operator }), 'PANTHER::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.martian.updateBurnRate(0, { from: operator });
        assert.equal((await this.martian.burnRate()).toString(), '0');
        await this.martian.updateBurnRate(100, { from: operator });
        assert.equal((await this.martian.burnRate()).toString(), '100');
        await expectRevert(this.martian.updateBurnRate(101, { from: operator }), 'PANTHER::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        await this.martian.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.martian.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '0');

        await this.martian.transfer(bob, 12345, { from: alice });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.martian.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '494');

        await this.martian.approve(carol, 22345, { from: alice });
        await this.martian.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.martian.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        await this.martian.mint(alice, 10000000, { from: owner });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '0');

        await this.martian.transfer(bob, 19, { from: alice });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.martian.balanceOf(bob)).toString(), '19');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        assert.equal((await this.martian.transferTaxRate()).toString(), '500');
        assert.equal((await this.martian.burnRate()).toString(), '20');

        await this.martian.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.martian.transferTaxRate()).toString(), '0');

        await this.martian.mint(alice, 10000000, { from: owner });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '0');

        await this.martian.transfer(bob, 10000, { from: alice });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.martian.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        assert.equal((await this.martian.transferTaxRate()).toString(), '500');
        assert.equal((await this.martian.burnRate()).toString(), '20');

        await this.martian.updateBurnRate(0, { from: operator });
        assert.equal((await this.martian.burnRate()).toString(), '0');

        await this.martian.mint(alice, 10000000, { from: owner });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '0');

        await this.martian.transfer(bob, 1234, { from: alice });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.martian.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        assert.equal((await this.martian.transferTaxRate()).toString(), '500');
        assert.equal((await this.martian.burnRate()).toString(), '20');

        await this.martian.updateBurnRate(100, { from: operator });
        assert.equal((await this.martian.burnRate()).toString(), '100');

        await this.martian.mint(alice, 10000000, { from: owner });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '0');

        await this.martian.transfer(bob, 1234, { from: alice });
        assert.equal((await this.martian.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.martian.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.martian.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.martian.balanceOf(this.martian.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.martian.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.martian.maxTransferAmount()).toString(), '0');

        await this.martian.mint(alice, 1000000, { from: owner });
        assert.equal((await this.martian.maxTransferAmount()).toString(), '5000');

        await this.martian.mint(alice, 1000, { from: owner });
        assert.equal((await this.martian.maxTransferAmount()).toString(), '5005');

        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        await this.martian.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.martian.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        assert.equal((await this.martian.isExcludedFromAntiWhale(operator)), false);
        await this.martian.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.martian.isExcludedFromAntiWhale(operator)), true);

        await this.martian.mint(alice, 10000, { from: owner });
        await this.martian.mint(bob, 10000, { from: owner });
        await this.martian.mint(carol, 10000, { from: owner });
        await this.martian.mint(operator, 10000, { from: owner });
        await this.martian.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.martian.maxTransferAmount()).toString(), '250');
        await expectRevert(this.martian.transfer(bob, 251, { from: alice }), 'PANTHER::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.martian.approve(carol, 251, { from: alice });
        await expectRevert(this.martian.transferFrom(alice, carol, 251, { from: carol }), 'PANTHER::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.martian.transfer(bob, 250, { from: alice });
        await this.martian.transferFrom(alice, carol, 250, { from: carol });

        await this.martian.transfer(this.burnAddress, 251, { from: alice });
        await this.martian.transfer(operator, 251, { from: alice });
        await this.martian.transfer(owner, 251, { from: alice });
        await this.martian.transfer(this.martian.address, 251, { from: alice });

        await this.martian.transfer(alice, 251, { from: operator });
        await this.martian.transfer(alice, 251, { from: owner });
        await this.martian.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.martian.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.martian.swapAndLiquifyEnabled()), false);

        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        await this.martian.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.martian.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.martian.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.martian.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.martian.transferOperator(operator, { from: owner });
        assert.equal((await this.martian.operator()), operator);

        await this.martian.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.martian.minAmountToLiquify()).toString(), '100');
    });
});
