import { createSlice } from '@reduxjs/toolkit';

const initialState = localStorage.getItem('cart')
  ? JSON.parse(localStorage.getItem('cart'))
  : { cartItems: [], shippingAddress: {}, paymentMethod: 'Razorpay' };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action) {
      const item = action.payload;
      const existItem = state.cartItems.find((x) => x._id === item._id && x.weight === item.weight);

      if (existItem) {
        state.cartItems = state.cartItems.map((x) =>
          (x._id === existItem._id && x.weight === existItem.weight) ? item : x
        );
      } else {
        state.cartItems = [...state.cartItems, item];
      }

      localStorage.setItem('cart', JSON.stringify(state));
    },
    removeFromCart(state, action) {
      const { id, weight } = action.payload;
      state.cartItems = state.cartItems.filter((x) => !(x._id === id && x.weight === weight));
      localStorage.setItem('cart', JSON.stringify(state));
    },
    saveShippingAddress(state, action) {
      state.shippingAddress = action.payload;
      localStorage.setItem('cart', JSON.stringify(state));
    },
    savePaymentMethod(state, action) {
      state.paymentMethod = action.payload;
      localStorage.setItem('cart', JSON.stringify(state));
    },
    clearCartItems(state) {
      state.cartItems = [];
      localStorage.setItem('cart', JSON.stringify(state));
    },
  },
});

export const { addToCart, removeFromCart, saveShippingAddress, savePaymentMethod, clearCartItems } = cartSlice.actions;
export default cartSlice.reducer;
