import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription, NodeOperationError,
} from 'n8n-workflow';
import {addressBook, contact} from "./actions";
import {loadOptions} from "./methods";
import {CardDav} from "./actions/Interface";

export class CardDavNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CardDAV Node',
		name: 'cardDavNode',
		icon: 'file:CardDav.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Use a CardDAV Server',
		defaults: {
			name: 'CardDAV Node',
		},
		credentials: [
			{
				name: 'genericDavCredentialsApi',
				required: false,
			},
		],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Address Book',
						value: 'addressBook'
					},
					{
						name: 'Contact',
						value: 'contact'
					}
				],
				default: 'addressBook'
			},
			...addressBook.descriptions,
			...contact.descriptions
		],
	};

	methods = {loadOptions}

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operationResult: INodeExecutionData[] = []

		for (let index = 0; index < items.length; index++) {
			const resource = this.getNodeParameter<CardDav>('resource', index)
			const operation = this.getNodeParameter('operation', index)
			const carddav = {
				resource,
				operation
			} as CardDav
			let responseData: IDataObject | IDataObject[] = []
			try {
				if (resource === 'addressBook') {
					// @ts-ignore
					responseData = await addressBook[carddav.operation].execute.call(this, index)
				} else if (resource === 'contact') {
					// @ts-ignore
					responseData = await contact[carddav.operation].execute.call(this, index)
				} else {
					throw new NodeOperationError(this.getNode(), `unknown resource: ${resource}`)
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{itemData: {item: index}},
				);
				operationResult.push(...executionData);
			} catch (err) {
				if (this.continueOnFail()) {
					operationResult.push({json: this.getInputData(index)[0].json, error: err})
				} else {
					if (err.context) err.context.itemIndex = index;
					throw err;
				}
			}
		}

		return [operationResult]
	}
}
