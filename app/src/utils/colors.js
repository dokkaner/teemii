import * as tailwindColors from 'tailwindcss/colors'
import chroma from 'chroma-js'

const twColors = tailwindColors

function isColorHexValue (color) {
  return /^#([0-9a-f]{3,8})$/i.test(color)
}

function hexToRgb (hex) {
  if (!chroma.valid(hex)) {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  const chromaColor = chroma(hex)
  const [r, g, b] = chromaColor.rgb()
  const a = chromaColor.alpha()
  return { r, g, b, a }
}

function findEquivalentTailwindClass (hexColor, tailwindColors) {
  for (const [colorName, color] of Object.entries(tailwindColors)) {
    if (typeof color === 'string') {
      if (color.toLowerCase() === hexColor.toLowerCase()) {
        return [colorName, 'DEFAULT']
      }
    } else if (typeof color === 'object') {
      for (const [shade, shadeColor] of Object.entries(color)) {
        if (typeof shadeColor === 'string' && shadeColor.toLowerCase() === hexColor.toLowerCase()) {
          return [colorName, shade]
        }
      }
    }
  }

  return null
}

function closestColor (inputColor, colors) {
  let closestColorName = ''
  let closestShade = 'DEFAULT'
  let smallestDistance = Infinity

  function updateClosest (colorName, shade, shadeColor) {
    const distance = colorDistance(inputColor, hexToRgb(shadeColor))
    if (distance < smallestDistance) {
      smallestDistance = distance
      closestColorName = colorName
      closestShade = shade
    }
  }

  for (const [colorName, colorValue] of Object.entries(colors)) {
    if (typeof colorValue === 'string' && chroma.valid(colorValue)) {
      updateClosest(colorName, 'DEFAULT', colorValue)
    } else if (typeof colorValue === 'object') {
      for (const [shade, shadeColor] of Object.entries(colorValue)) {
        if (typeof shadeColor === 'string' && chroma.valid(shadeColor)) {
          updateClosest(colorName, shade, shadeColor)
        }
      }
    }
  }

  return [closestColorName, closestShade]
}

function colorDistance (color1, color2) {
  const dr = color1.r - color2.r
  const dg = color1.g - color2.g
  const db = color1.b - color2.b
  const da = (color1.a || 1) - (color2.a || 1)
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da)
}

export function colorToTailwindClass (colorInput) {
  const isTailwindColorName = Object.keys(twColors).includes(colorInput.toLowerCase())
  if (isTailwindColorName) {
    if (colorInput.toLowerCase() === 'white' || colorInput.toLowerCase() === 'black') {
      return colorInput.toLowerCase()
    }
  }

  const isValidColor = chroma.valid(colorInput)
  if (!isValidColor) throw new Error(`Invalid color input: "${colorInput}"`)

  const hexColor = !isColorHexValue(colorInput) ? chroma(colorInput).hex() : colorInput
  const rgbColor = hexToRgb(hexColor)

  const result = findEquivalentTailwindClass(hexColor, twColors)
  if (result !== null) {
    const [colorName, shade] = result
    if (shade === 'DEFAULT') {
      return colorName
    }
    return `${colorName}-${shade}`
  } else {
    const [colorName, shade] = closestColor(rgbColor, twColors)

    if (shade === 'DEFAULT') {
      return colorName
    }

    return `${colorName}-${shade}`
  }
}
