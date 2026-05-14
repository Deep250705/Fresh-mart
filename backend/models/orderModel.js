import mongoose from 'mongoose';

const orderSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        weight: { type: String },
        unit: { type: String },
        vendor: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
        product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
        costPrice: { type: Number, required: true, default: 0 },
        commissionRate: { type: Number, required: true, default: 0 },
        isDelivered: { type: Boolean, default: false },
        isPacked: { type: Boolean, default: false }
      },
    ],
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    paymentMethod: { type: String, required: true },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    itemsPrice: { type: Number, required: true, default: 0.0 },
    taxPrice: { type: Number, required: true, default: 0.0 },
    shippingPrice: { type: Number, required: true, default: 0.0 },
    deliveryFee: { type: Number, required: true, default: 0.0 },
    deliveryAgentPayout: { type: Number, required: true, default: 0.0 },
    totalPrice: { type: Number, required: true, default: 0.0 },
    isPaid: { type: Boolean, required: true, default: false },
    paidAt: { type: Date },
    deliveryMethod: { type: String, enum: ['Self', 'Third-Party'], default: 'Self' },
    deliveryAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryAgent' },
    isPacked: { type: Boolean, default: false },
    packedAt: { type: Date },
    isPicked: { type: Boolean, default: false },
    pickedAt: { type: Date },
    isInTransit: { type: Boolean, default: false },
    inTransitAt: { type: Date },
    isDelivered: { type: Boolean, required: true, default: false },
    deliveredAt: { type: Date },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Packed', 'Assigned', 'Picked', 'In Transit', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

// Performance indexes (common dashboard queries)
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'orderItems.vendor': 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ isPaid: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
