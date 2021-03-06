import Vue from 'vue';
import client from './ShopifyGraphqlClient';

const module = {
  namespaced: true,
  state: {
    pages: { }
  },
  mutations: {
    SET_PAGE(state, page){
      Vue.set(state.pages, page.handle, page)
    }
  },
  actions: {
    fetch: (context, pageHandle) => new Promise((resolve, reject) => {
      if(context.state.pages[pageHandle]){
        resolve(context.state.pages[pageHandle])
      }else{
        const productsQuery = client.graphQLClient.query(root => {
          root.addConnection('pages', {args: { first: 1, query: `handle:${pageHandle}`}}, page => {
            page.add('body');
            page.add('handle');
            page.add('title');
          })
        })
        client.graphQLClient.send(productsQuery).then(({ model }) => {
          model.pages.forEach(object => {
            context.commit('SET_PAGE', object)
            resolve(object);
          })
          resolve();
        }).catch(e => {
          reject(e);
        });
      }
    })
  }
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
