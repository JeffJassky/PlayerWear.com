import Vue from 'vue';

// import axios from 'axios';
import Utilities from '../utilities';
import client from './ShopifyGraphqlClient';

const module = {
  namespaced: true,
  state: {
    checkoutId: null,
    checkout: null,
    isOpen: false
  },
  mutations: {
    SET_CHECKOUT(state, checkout){
      state.checkoutId = checkout.id;
      state.checkout = checkout;
    },
    toggleCart(state, payload) {
      Vue.set(state,'isOpen', payload === 'open')
      return state;
    },
    DELETE_CHECKOUT(state){
      state.checkoutId = null;
      state.checkout = null;
    }
  },
  actions: {
    async initialize({commit, state, dispatch}){
      if(!state.checkout){
        if(!state.checkoutId){

          // NO CHECKOUT EXISTS. CREATE A NEW ONE.
          await client.checkout.create().then(checkout => {
            commit('SET_CHECKOUT', checkout)
          })

        }else{

          // CHECKOUT EXISTS. FETCH IT.
          await client.checkout.fetch(state.checkoutId).then(async checkout => {

            if(checkout.completedAt){
              // THIS CHECKOUT HAS ALREADY BEEN COMPLETED
              // DELETE IT AND REINITIALIZE NEW ONE
              console.log('Order Successful.')
              commit('DELETE_CHECKOUT')
              await dispatch('initialize');
            }else{

              // SETTING NEW CHECKOUT
              commit('SET_CHECKOUT', checkout)
            }
          });
        }
        await dispatch('updateEmail');
      }
    },
    async addItem ({state, commit}, item){
      commit(
        'SET_CHECKOUT',
        await client.checkout.addLineItems(
          state.checkoutId,
          [{
            quantity: item.quantity,
            variantId: item.idEncoded
          }]
        )
      );
    },
    async updateItem ({state, commit}, item) {
      commit(
        'SET_CHECKOUT',
        await client.checkout.updateLineItems(
          state.checkoutId,
          item
        )
      )
    },
    loadUpsellProducts: context => new Promise((resolve, reject) => {
      context
        .dispatch('initialize')
        .then(() => {
          const promises = context.getters.vendorsInCart.map(
            vendor => context.dispatch(
              'load',
              {
                vendor,
                tag: 'upsell',
                limit: 10
              },
              { root: true }
            )
          );
          Promise.all(promises)
            .then(() => { resolve(); })
            .catch(e => { reject(e) })
      })
    }),
    async updateEmail({state, rootState, commit}){
      if(rootState.customers.email){
        commit('SET_CHECKOUT', await client.checkout.updateEmail(
          state.checkout.id,
          rootState.customers.email
        ))
      }
    },
    checkout({state}){
      if(state.checkout && state.checkout.webUrl){
        window.location.href = state.checkout.webUrl.replace('amplify-11-swag-store.myshopify.com','player-wear.com');
      }
    }
  },
  getters: {
    isOpen: state => state.isOpen,
    items: state => state.checkout && state.checkout.lineItems || [],
    uniqueItemCount: (state, getters) => getters.items.length,
    itemCount: (state, getters) => {
      let count = 0;
      getters.items.forEach(item => count += item.quantity)
      return count;
    },
    vendorsInCart: (state, getters) => [...new Set(getters.items.map(item => item.vendor))],
    subtotal: (state, getters) => {
      let total = 0;
      if (getters.items) {
        getters.items.forEach(item => {
          total += (item.variant.price * 100) * item.quantity;
        });
      }
      return total;
    },
    total: (state, getters) => getters.subtotal + 400,
    upsellProducts: (state, getters, another, rootGetters) => limit => {
      let products = [];
      getters.vendorsInCart.forEach(vendor => {
        products = products.concat(rootGetters['products/byTagAndVendor']('upsell', vendor, limit || 3))
      });
      products = products.filter(product => {
        const hasOneVariant = product.variants.length === 1;
        const variantIsAvailable = product.variants[0].availableForSale
        // const isInCart = getters.items.find()
        return hasOneVariant && variantIsAvailable
      })
      return Utilities.arrayShuffle(products).slice(0, limit || 3);
    }
  },
}


export const state = () => module.state
export const mutations = module.mutations;
export const actions = module.actions;
export const getters = module.getters;
export default {
  state,
  mutations,
  actions,
  getters
}
