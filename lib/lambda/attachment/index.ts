import {
    EC2Client,
    DisassociateTransitGatewayRouteTableCommand,
    DescribeTransitGatewayAttachmentsCommand,
    AssociateTransitGatewayRouteTableCommand,
    EnableTransitGatewayRouteTablePropagationCommand
} from '@aws-sdk/client-ec2';
import { setTimeout } from 'timers/promises';

const ec2Client = new EC2Client({})

export const handler = async (event: any) => {
    let vpcType: string;
    let attachmentID: string;
    
    // verify that required parameters are set
    if (process.env.internalRouteTableID == undefined || 
        process.env.firewallRouteTableID == undefined) {
            throw new Error("route tables IDs are missing")
    }

    // validate that event has required parameters
    try {
    vpcType = event["detail"]["requestParameters"]
        ["CreateTransitGatewayVpcAttachmentRequest"]["TagSpecifications"]
        ["Tag"]["Value"];
    attachmentID = event["detail"]["responseElements"]
        ["CreateTransitGatewayVpcAttachmentResponse"]
        ["transitGatewayVpcAttachment"]["transitGatewayAttachmentId"]
    } catch {
        throw new Error("required attribute missing");
    };

    // if (vpcType != "internal" && vpcType != "firewall") {
    //     throw new Error("vpc type is not internal or firewall")
    // }

    // let associationRouteTableID = undefined;
    // if (vpcType == "internal" && process.env.internalRouteTableID) {
    //     associationRouteTableID = process.env.intenalRouteTableID
    // } else associationRouteTableID = process.env.firewallRouteTableID

    let associationRouteTableID = undefined;
    if (vpcType == "firewall" && process.env.firewallRouteTableID) {
        associationRouteTableID = process.env.firewallRouteTableID
    } else associationRouteTableID = process.env.internalRouteTableID


    const describeAttachmentCommand = new DescribeTransitGatewayAttachmentsCommand({
        TransitGatewayAttachmentIds: [attachmentID]
    });
    const tgwAttachments = await ec2Client.send(describeAttachmentCommand);

    if (!tgwAttachments.TransitGatewayAttachments) {
        throw new Error("attachment not found in TGW");
    };

    // If the attachment is not yet ready. Wait for it to come available.
    if (tgwAttachments.TransitGatewayAttachments[0].State == 'pending') {
       await waitAvailable(attachmentID);
    };

    // // Disassociate the attachment if already attached
    // if (tgwAttachments.TransitGatewayAttachments[0].Association !== undefined) {
    //     const routeTableID = tgwAttachments.TransitGatewayAttachments[0].Association?.TransitGatewayRouteTableId

    //     const disassociateCommand = new DisassociateTransitGatewayRouteTableCommand({
    //         TransitGatewayAttachmentId: attachmentID,
    //         TransitGatewayRouteTableId: routeTableID,
    //     });

    //     let associated = true;
    //     while (associated) {
    //         // Disassociate attachment
    //         await ec2Client.send(disassociateCommand);

    //         // Wait for attachment to get disassociated
    //         await setTimeout(2000);

    //         let attachments = await ec2Client.send(describeAttachmentCommand);
            
    //         if (attachments.TransitGatewayAttachments) {
    //             if (attachments.TransitGatewayAttachments[0].Association == undefined) {
    //                 associated = false;
    //             };
    //         };
    //     };
    // }

    //associate attachment with correct route table
    const attachCommand = new AssociateTransitGatewayRouteTableCommand({
        TransitGatewayAttachmentId: attachmentID,
        TransitGatewayRouteTableId: associationRouteTableID,
    });

    await ec2Client.send(attachCommand);

    //propagate attachment with correct route table
    if (vpcType == "jesse-test") {
        await ec2Client.send(new EnableTransitGatewayRouteTablePropagationCommand({
            TransitGatewayRouteTableId: process.env.firewallRouteTableID,
            TransitGatewayAttachmentId: attachmentID,
        }));
    };

}

const waitAvailable = async(attachmentID: string): Promise<void> => {
    const describeAttachmentCommand = new DescribeTransitGatewayAttachmentsCommand({
        TransitGatewayAttachmentIds: [attachmentID]
    });

    let pending = true;
    while (pending) {

        // Wait for attachment to get created
        await setTimeout(2000);

        const attachmentStatus = await ec2Client.send(describeAttachmentCommand);
            if (attachmentStatus.TransitGatewayAttachments) {
                if (attachmentStatus.TransitGatewayAttachments[0].State !== 'pending') {
                    pending = false;
                }
            }
    }
    return
}