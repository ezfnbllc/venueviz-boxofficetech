import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { description, action } = await req.json()

    if (!description) {
      return NextResponse.json({ error: 'Description required' }, { status: 400 })
    }

    if (!action || !['lengthen', 'shorten', 'professional'].includes(action)) {
      return NextResponse.json({ error: 'Valid action required (lengthen, shorten, professional)' }, { status: 400 })
    }

    let adjustedDescription = description

    if (action === 'shorten') {
      // Shorten: Keep first 2-3 sentences, remove filler words
      const sentences = description.match(/[^.!?]+[.!?]+/g) || [description]
      if (sentences.length > 2) {
        adjustedDescription = sentences.slice(0, 2).join(' ').trim()
      } else {
        // Remove filler phrases
        adjustedDescription = description
          .replace(/\b(very|really|actually|basically|literally|just|simply|absolutely|definitely|certainly|totally|completely)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
      }
    } else if (action === 'lengthen') {
      // Lengthen: Add engaging details
      const eventType = detectEventType(description)
      const additions = getExpansionPhrases(eventType)

      // Add a relevant sentence
      const additionIndex = Math.floor(Math.random() * additions.length)
      adjustedDescription = `${description} ${additions[additionIndex]}`
    } else if (action === 'professional') {
      // Polish: Make it more professional and engaging
      adjustedDescription = polishDescription(description)
    }

    return NextResponse.json({
      description: adjustedDescription,
      action,
      originalLength: description.length,
      newLength: adjustedDescription.length
    })

  } catch (error: any) {
    console.error('Description adjustment error:', error)
    return NextResponse.json({
      error: 'Failed to adjust description: ' + error.message,
      description: ''
    }, { status: 500 })
  }
}

function detectEventType(text: string): string {
  const lowerText = text.toLowerCase()

  if (lowerText.includes('comedy') || lowerText.includes('laugh') || lowerText.includes('stand-up')) {
    return 'comedy'
  }
  if (lowerText.includes('concert') || lowerText.includes('music') || lowerText.includes('band') || lowerText.includes('tour')) {
    return 'concert'
  }
  if (lowerText.includes('theater') || lowerText.includes('theatre') || lowerText.includes('play') || lowerText.includes('musical')) {
    return 'theater'
  }
  if (lowerText.includes('sports') || lowerText.includes('game') || lowerText.includes('match') || lowerText.includes('championship')) {
    return 'sports'
  }
  if (lowerText.includes('party') || lowerText.includes('celebration') || lowerText.includes('nye') || lowerText.includes('new year')) {
    return 'party'
  }
  if (lowerText.includes('bollywood') || lowerText.includes('cultural') || lowerText.includes('indian')) {
    return 'cultural'
  }

  return 'general'
}

function getExpansionPhrases(eventType: string): string[] {
  const phrases: Record<string, string[]> = {
    comedy: [
      'Prepare for an evening of side-splitting humor and unforgettable punchlines.',
      'This is your chance to experience comedy at its finest with world-class performers.',
      'Get ready to laugh until your sides hurt with this incredible lineup of comedic talent.'
    ],
    concert: [
      'Feel the energy as the music fills the venue and creates memories that will last a lifetime.',
      'This is more than just a concert - it\'s a musical journey you won\'t want to miss.',
      'Experience the magic of live music with state-of-the-art sound and lighting.'
    ],
    theater: [
      'Witness masterful performances that bring stories to life on stage.',
      'This production features stunning set designs and captivating performances.',
      'Theater at its finest - a must-see for anyone who appreciates the performing arts.'
    ],
    sports: [
      'Feel the excitement as elite athletes compete at the highest level.',
      'This is your chance to witness history in the making with world-class competition.',
      'Experience the thrill of live sports with an electrifying atmosphere.'
    ],
    party: [
      'Dance the night away with amazing music and an incredible atmosphere.',
      'Celebrate in style with premium entertainment and unforgettable moments.',
      'This is the event everyone will be talking about - don\'t miss out!'
    ],
    cultural: [
      'Immerse yourself in a rich cultural experience celebrating tradition and artistry.',
      'This event brings together the best of cultural entertainment and celebration.',
      'Experience the beauty of cultural performances in an unforgettable evening.'
    ],
    general: [
      'Don\'t miss this incredible opportunity to be part of something special.',
      'Secure your tickets now for an unforgettable experience.',
      'This is an event you won\'t want to miss - book your seats today!'
    ]
  }

  return phrases[eventType] || phrases.general
}

function polishDescription(description: string): string {
  let polished = description

  // Capitalize first letter of sentences
  polished = polished.replace(/(^|\. )([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase())

  // Replace casual words with professional alternatives
  const replacements: [RegExp, string][] = [
    [/\bawesome\b/gi, 'exceptional'],
    [/\bcool\b/gi, 'remarkable'],
    [/\bgreat\b/gi, 'outstanding'],
    [/\bamazing\b/gi, 'extraordinary'],
    [/\bfun\b/gi, 'enjoyable'],
    [/\bgonna\b/gi, 'going to'],
    [/\bwanna\b/gi, 'want to'],
    [/\bgotta\b/gi, 'have to'],
    [/\bkinda\b/gi, 'somewhat'],
    [/\blots of\b/gi, 'numerous'],
    [/\ba lot of\b/gi, 'many'],
    [/\breally\b/gi, 'truly'],
    [/\bget\b/gi, 'obtain'],
    [/\bbig\b/gi, 'significant'],
    [/\bshow\b/gi, 'performance'],
  ]

  for (const [pattern, replacement] of replacements) {
    polished = polished.replace(pattern, replacement)
  }

  // Ensure it ends with proper punctuation
  if (!/[.!?]$/.test(polished.trim())) {
    polished = polished.trim() + '.'
  }

  // Remove double spaces
  polished = polished.replace(/\s+/g, ' ').trim()

  return polished
}

export async function GET() {
  return NextResponse.json({
    message: 'Description adjustment API',
    method: 'POST',
    actions: ['lengthen', 'shorten', 'professional'],
    usage: 'Send POST with { description: "text", action: "lengthen|shorten|professional" }'
  })
}
