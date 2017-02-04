import * as Indexden from 'indexden-client';

let client: Indexden.Client = new Indexden.Client(process.env.INDEXDEN_ENDPOINT);

let doc: Indexden.Document.Identifier = {
  docid: "something"
};