export type ArtistRef = { name: string; id?: string };

export type Track = {
  id: string;
  title: string;
  artists: ArtistRef[];
  album?: { id?: string; name: string };
  duration?: number;
  thumb: string;
};

export type CardKind = "album" | "playlist" | "artist" | "song" | "video";

export type Card = {
  id: string;
  kind: CardKind;
  title: string;
  subtitle: string;
  thumb: string;
  track?: Track;
};

export type Chip = { label: string; color: string };

export type Section = {
  title: string;
  tracks?: Track[];
  cards?: Card[];
  chips?: Chip[];
};

export type HomeData = { sections: Section[] };

export type Collection = {
  kind: "album" | "playlist";
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  description: string;
  thumb: string;
  artists: ArtistRef[];
  tracks: Track[];
};

export type ArtistPage = {
  id: string;
  name: string;
  banner: string;
  thumb: string;
  description: string;
  audience: string;
  topSongs: Track[];
  sections: Section[];
};

export type SearchResult = {
  songs: Track[];
  videos: Track[];
  albums: Card[];
  artists: Card[];
  playlists: Card[];
};

export type Suggestion =
  | { kind: "query"; text: string }
  | { kind: "item"; card: Card };

export type Lyrics = { text: string; source: string };
