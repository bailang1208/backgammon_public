import axios from 'axios'

export default {
  user: {
    login: (credentials) =>
      axios.post('/api/auth/signin', credentials).then(res => res.data),
    signup: (user) =>
      axios.post('/api/auth/signup', user).then(res => res.data),
  }
}
