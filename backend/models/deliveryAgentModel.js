import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const deliveryAgentSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    isAvailable: { type: Boolean, default: true },
    assignedOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }]
  },
  { timestamps: true }
);

deliveryAgentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

deliveryAgentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const DeliveryAgent = mongoose.model('DeliveryAgent', deliveryAgentSchema);
export default DeliveryAgent;
