import Vue from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';

Vue.config.productionTip = false;

window.playerwear = new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#vue-app');
