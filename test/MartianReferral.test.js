const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const MartianReferral = artifacts.require('MartianReferral');

contract('MartianReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.martianReferral = await MartianReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.martianReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.martianReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.martianReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.martianReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.martianReferral.operators(operator)).valueOf(), true);

        await this.martianReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.martianReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.martianReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.martianReferral.operators(operator)).valueOf(), false);
        await this.martianReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.martianReferral.operators(operator)).valueOf(), true);

        await this.martianReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.martianReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.martianReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.martianReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.martianReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.martianReferral.referralsCount(referrer)).valueOf(), '0');

        await this.martianReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.martianReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.martianReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.martianReferral.referralsCount(bob)).valueOf(), '0');
        await this.martianReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.martianReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.martianReferral.getReferrer(alice)).valueOf(), referrer);

        await this.martianReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.martianReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.martianReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.martianReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.martianReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.martianReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.martianReferral.operators(operator)).valueOf(), true);

        await this.martianReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.martianReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.martianReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.martianReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.martianReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.martianReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.martianReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.martianReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
