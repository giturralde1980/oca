export const accountSchema = {
  type: 'object',
  required: ['Id', 'Name', 'Type', 'CreatedDate', 'LastModifiedDate'],
  properties: {
    Id:               { type: 'string' },
    Name:             { type: 'string' },
    Type:             { type: ['string', 'null'] },
    Phone:            { type: ['string', 'null'] },
    BillingCity:      { type: ['string', 'null'] },
    BillingCountry:   { type: ['string', 'null'] },
    OwnerId:          { type: 'string' },
    CreatedDate:      { type: 'string' },
    LastModifiedDate: { type: 'string' },
  },
};
