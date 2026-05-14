import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function test() {
  try {
    const order = await instance.orders.create({
      amount: 100,
      currency: "INR",
      receipt: "test_receipt",
    });
    fs.writeFileSync('test-out.txt', "SUCCESS: " + JSON.stringify(order), 'utf-8');
  } catch (err) {
    fs.writeFileSync('test-out.txt', "FAIL: " + JSON.stringify(err), 'utf-8');
  }
}

test();
