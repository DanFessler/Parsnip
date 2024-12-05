const sub = 16;
const commissions = 4 + 2 + 1 + 1;
const growth = 3;
let account = 0;
let paidCommissions = 0;

const customerPrototype = {
  trial: true,
  isFree: false,
  willbefree: false,
  referrals: 0,
};

const customers = [{ ...customerPrototype }];

// random integer between min and max inclusive
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// monthly tick
function tick() {
  const newCustomers = [];

  for (const customer of customers) {
    // if the customer is paying, add it to the account
    if (!customer.trial && !customer.isFree) {
      account += sub;
    }

    // if the customer isn't on trial, pay a commission
    if (!customer.trial) {
      // && !customer.isFree
      account -= commissions;
      paidCommissions += commissions;
    }

    // if this customer was on trial, they are no longer
    if (customer.trial) {
      customer.trial = false;
    }

    // if a customer will be free, they are free now (they've paid their first month)
    if (customer.willbefree) {
      customer.isFree = true;
    }

    // if a customer isn't free, they will want to recruit people
    if (!customer.isFree) {
      let newCount = randomInt(0, 3);
      newCustomers.push(
        ...new Array(newCount).fill().map(() => ({ ...customerPrototype }))
      );

      customer.referrals += newCount;
      if (customer.referrals >= 3) {
        customer.willbefree = true;
        customer.isFree = true;
      }
    }
  }

  customers.push(...newCustomers);
}

for (let i = 0; i < 15; i++) {
  tick();

  console.log({
    customers: customers.length,
    account,
    paidCommissions,
  });
}
