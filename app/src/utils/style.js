export default {
  trimhex (s) {
    return (s.charAt(0) === '#') ? s.substring(1, 7) : s
  },

  stateToStyle (s) {
    switch (s) {
      case 0:
        return 'border-main-200'// bg-main-100 text-main-800 bg-light-100 text-light-800
      case 1:
        return 'border-indigo-200'
      case 2:
        return 'border-blue-200'
      case 3:
        return 'border-accent-200'
      default:
        return 'border-red-200'
    }
  },

  stateToColor (s) {
    switch (s) {
      case 0:
        return 'main-500'
      case 1:
        return 'indigo-500'
      case 2:
        return 'accent-500'
      case 3:
        return 'red-500'
      case 4:
        return 'main-200'
    }
  }
}
