export interface Mood {
  id: string
  label: string
  icon: string
  genreIds: number[]
  keywordIds: number[]
  sortOverride?: string
}

export const MOODS: Mood[] = [
  {
    id: 'make-me-laugh',
    label: 'Make Me Laugh',
    icon: 'Laugh',
    genreIds: [35],
    keywordIds: [8201, 9755, 9253, 10123], // satire, parody, slapstick comedy, dark comedy
  },
  {
    id: 'edge-of-my-seat',
    label: 'Edge of My Seat',
    icon: 'Flame',
    genreIds: [53, 28],
    keywordIds: [288394, 10051, 3713], // suspense, heist, chase
  },
  {
    id: 'feel-good',
    label: 'Feel-Good',
    icon: 'Heart',
    genreIds: [35, 10749, 10751],
    keywordIds: [329716, 335803, 334465], // feel-good, wholesome, uplifting
  },
  {
    id: 'mind-bending',
    label: 'Mind-Bending',
    icon: 'Brain',
    genreIds: [878, 9648],
    keywordIds: [4379, 4565, 272553, 275311], // time travel, dystopia, psychological, plot twist
  },
  {
    id: 'dark-and-twisted',
    label: 'Dark & Twisted',
    icon: 'Skull',
    genreIds: [27, 53],
    keywordIds: [340566, 6158, 9748], // noir, cult, revenge
  },
  {
    id: 'comfort-watch',
    label: 'Comfort Watch',
    icon: 'Coffee',
    genreIds: [35, 10749],
    keywordIds: [326774, 164246], // cozy, nostalgic
  },
  {
    id: 'background-noise',
    label: 'Background Noise',
    icon: 'Headphones',
    genreIds: [99, 35],
    keywordIds: [],
    sortOverride: 'popularity.desc',
  },
  {
    id: 'cry-it-out',
    label: 'Cry It Out',
    icon: 'CloudRain',
    genreIds: [18, 10749],
    keywordIds: [6203, 156924, 9672], // loss, tearjerker, based on true story
  },
]
