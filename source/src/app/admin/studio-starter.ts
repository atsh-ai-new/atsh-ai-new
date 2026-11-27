import type {ArtPose,VoiceId} from "./cartoon-plan";
export const locations={restaurant:"مطعم / كافيه",school:"مدرسة / فصل",clinic:"عيادة",shop:"متجر / معرض",office:"مكتب / شركة",home:"منزل",street:"شارع / مدينة",workshop:"ورشة / مصنع",hospital:"مستشفى",other:"موقع آخر"} as const;
export type LocationType=keyof typeof locations;
type ArtFile={pose:ArtPose;file:string};
type Starter={kind:"background"|"hero"|"prop";category:string;name:string;locationType?:LocationType;files:ArtFile[];voiceId?:VoiceId;outfits?:{name:string;files:ArtFile[]}[]};
const catalog:Starter[]= [
  {
    "kind": "background",
    "category": "background",
    "locationType": "office",
    "name": "استوديو ATSH AI — إطلالة القاهرة",
    "files": [
      {
        "pose": "stand",
        "file": "brand-location-0.webp"
      }
    ]
  },
  {
    "kind": "background",
    "category": "background",
    "locationType": "restaurant",
    "name": "مطعم سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "brand-places-0.webp"
      }
    ]
  },
  {
    "kind": "background",
    "category": "background",
    "locationType": "school",
    "name": "فصل مدرسي سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "brand-places-1.webp"
      }
    ]
  },
  {
    "kind": "background",
    "category": "background",
    "locationType": "clinic",
    "name": "عيادة سينمائية",
    "files": [
      {
        "pose": "stand",
        "file": "brand-places-2.webp"
      }
    ]
  },
  {
    "kind": "background",
    "category": "background",
    "locationType": "shop",
    "name": "متجر سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "brand-places-3.webp"
      }
    ]
  },
  {
    "kind": "background",
    "category": "background",
    "locationType": "home",
    "name": "منزل مصري سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "places-animated-0.webp"
      }
    ]
  },
  {
    "kind": "background",
    "category": "background",
    "locationType": "street",
    "name": "شارع القاهرة السينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "places-animated-1.webp"
      }
    ]
  },
  {
    "kind": "background",
    "category": "background",
    "locationType": "workshop",
    "name": "ورشة سيارات سينمائية",
    "files": [
      {
        "pose": "stand",
        "file": "places-animated-2.webp"
      }
    ]
  },
  {
    "kind": "background",
    "category": "background",
    "locationType": "hospital",
    "name": "مستشفى سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "places-animated-3.webp"
      }
    ]
  },
  {
    "kind": "hero",
    "category": "human",
    "name": "ATSH AI — مقدم الإعلان",
    "files": [
      {
        "pose": "stand",
        "file": "host-man-stand.webp"
      },
      {
        "pose": "talk-open",
        "file": "host-man-talk-open.webp"
      },
      {
        "pose": "point",
        "file": "host-man-point.webp"
      },
      {
        "pose": "wave",
        "file": "host-man-wave.webp"
      },
      {
        "pose": "walk-a",
        "file": "host-man-walk-a.webp"
      },
      {
        "pose": "walk-b",
        "file": "host-man-walk-b.webp"
      },
      {
        "pose": "sit",
        "file": "host-man-sit.webp"
      },
      {
        "pose": "think",
        "file": "host-man-think.webp"
      },
      {
        "pose": "explain",
        "file": "host-man-talk-open.webp"
      }
    ],
    "voiceId": "egyptian-male",
    "outfits": [
      {
        "name": "ملابس كاجوال",
        "files": [
          {
            "pose": "stand",
            "file": "man-casual-stand.webp"
          },
          {
            "pose": "talk-open",
            "file": "man-casual-talk-open.webp"
          },
          {
            "pose": "wave",
            "file": "man-casual-wave.webp"
          },
          {
            "pose": "sit",
            "file": "man-casual-sit.webp"
          }
        ]
      }
    ]
  },
  {
    "kind": "hero",
    "category": "human",
    "name": "ATSH AI — مقدمة الإعلان",
    "files": [
      {
        "pose": "stand",
        "file": "host-woman-stand.webp"
      },
      {
        "pose": "talk-open",
        "file": "host-woman-talk-open.webp"
      },
      {
        "pose": "tablet",
        "file": "host-woman-tablet.webp"
      },
      {
        "pose": "wave",
        "file": "host-woman-wave.webp"
      },
      {
        "pose": "walk-a",
        "file": "host-woman-walk-a.webp"
      },
      {
        "pose": "walk-b",
        "file": "host-woman-walk-b.webp"
      },
      {
        "pose": "sit",
        "file": "host-woman-sit.webp"
      },
      {
        "pose": "think",
        "file": "host-woman-think.webp"
      },
      {
        "pose": "explain",
        "file": "host-woman-talk-open.webp"
      }
    ],
    "voiceId": "egyptian-female",
    "outfits": [
      {
        "name": "ملابس كاجوال",
        "files": [
          {
            "pose": "stand",
            "file": "woman-casual-stand.webp"
          },
          {
            "pose": "talk-open",
            "file": "woman-casual-talk-open.webp"
          },
          {
            "pose": "wave",
            "file": "woman-casual-wave.webp"
          },
          {
            "pose": "sit",
            "file": "woman-casual-sit.webp"
          }
        ]
      }
    ]
  },
  {
    "kind": "hero",
    "category": "human",
    "name": "آدم — شاب مصري",
    "files": [
      {
        "pose": "stand",
        "file": "boy-animated-stand.webp"
      },
      {
        "pose": "talk-open",
        "file": "boy-animated-talk-open.webp"
      },
      {
        "pose": "wave",
        "file": "boy-animated-wave.webp"
      },
      {
        "pose": "sit",
        "file": "boy-animated-sit.webp"
      },
      {
        "pose": "explain",
        "file": "boy-animated-talk-open.webp"
      }
    ],
    "voiceId": "egyptian-teen-male"
  },
  {
    "kind": "hero",
    "category": "human",
    "name": "ليلى — شابة مصرية",
    "files": [
      {
        "pose": "stand",
        "file": "girl-animated-stand.webp"
      },
      {
        "pose": "talk-open",
        "file": "girl-animated-talk-open.webp"
      },
      {
        "pose": "wave",
        "file": "girl-animated-wave.webp"
      },
      {
        "pose": "sit",
        "file": "girl-animated-sit.webp"
      },
      {
        "pose": "explain",
        "file": "girl-animated-talk-open.webp"
      }
    ],
    "voiceId": "egyptian-teen-female"
  },
  {
    "kind": "hero",
    "category": "human",
    "name": "عمر — طفل مصري",
    "files": [
      {
        "pose": "stand",
        "file": "childboy-animated-stand.webp"
      },
      {
        "pose": "talk-open",
        "file": "childboy-animated-talk-open.webp"
      },
      {
        "pose": "wave",
        "file": "childboy-animated-wave.webp"
      },
      {
        "pose": "sit",
        "file": "childboy-animated-sit.webp"
      },
      {
        "pose": "explain",
        "file": "childboy-animated-talk-open.webp"
      }
    ],
    "voiceId": "egyptian-child-male"
  },
  {
    "kind": "hero",
    "category": "human",
    "name": "مريم — طفلة مصرية",
    "files": [
      {
        "pose": "stand",
        "file": "childgirl-animated-stand.webp"
      },
      {
        "pose": "talk-open",
        "file": "childgirl-animated-talk-open.webp"
      },
      {
        "pose": "wave",
        "file": "childgirl-animated-wave.webp"
      },
      {
        "pose": "sit",
        "file": "childgirl-animated-sit.webp"
      },
      {
        "pose": "explain",
        "file": "childgirl-animated-talk-open.webp"
      }
    ],
    "voiceId": "egyptian-child-female"
  },
  {
    "kind": "hero",
    "category": "animal",
    "name": "قطة سينمائية",
    "files": [
      {
        "pose": "stand",
        "file": "cat-stand.webp"
      },
      {
        "pose": "talk-open",
        "file": "cat-talk-open.webp"
      }
    ]
  },
  {
    "kind": "hero",
    "category": "animal",
    "name": "كلب سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "dog-stand.webp"
      },
      {
        "pose": "talk-open",
        "file": "dog-talk-open.webp"
      }
    ]
  },
  {
    "kind": "prop",
    "category": "vehicle",
    "name": "سيارة زرقاء سينمائية",
    "files": [
      {
        "pose": "stand",
        "file": "car-stand.webp"
      }
    ]
  },
  {
    "kind": "prop",
    "category": "vehicle",
    "name": "سيارة توصيل سينمائية",
    "files": [
      {
        "pose": "stand",
        "file": "van-stand.webp"
      }
    ]
  },
  {
    "kind": "prop",
    "category": "vehicle",
    "name": "توك توك مصري",
    "files": [
      {
        "pose": "stand",
        "file": "tuktuk-stand.webp"
      }
    ]
  },
  {
    "kind": "prop",
    "category": "door",
    "name": "باب خشبي سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "door-stand.webp"
      },
      {
        "pose": "open",
        "file": "door-open.webp"
      }
    ]
  },
  {
    "kind": "prop",
    "category": "object",
    "name": "مكتب وحاسوب سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "desk-stand.webp"
      }
    ]
  },
  {
    "kind": "prop",
    "category": "object",
    "name": "طاولة مطعم سينمائية",
    "files": [
      {
        "pose": "stand",
        "file": "table-stand.webp"
      }
    ]
  },
  {
    "kind": "prop",
    "category": "object",
    "name": "مقعد فصل سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "chair-stand.webp"
      }
    ]
  },
  {
    "kind": "prop",
    "category": "object",
    "name": "نبات ديكور سينمائي",
    "files": [
      {
        "pose": "stand",
        "file": "plant-stand.webp"
      }
    ]
  }
];
export function starterArtwork():Starter[]{return catalog;}
