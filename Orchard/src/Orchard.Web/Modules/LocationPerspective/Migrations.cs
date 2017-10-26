using System;
using System.Collections.Generic;
using System.Data;
using Orchard.ContentManagement.Drivers;
using Orchard.ContentManagement.MetaData;
using Orchard.ContentManagement.MetaData.Builders;
using Orchard.Core.Contents.Extensions;
using Orchard.Data.Migration;

namespace LocationPerspective
{
    public class Migrations : DataMigrationImpl {

        public int Create() {
            // Creating table LocationPerspectivePartRecord
            SchemaBuilder.CreateTable("LocationPerspectivePartRecord", table => table
                .ContentPartRecord()
                .Column("SourceDocuments", DbType.String)
                .Column("MapType", DbType.String)
                .Column("Height", DbType.Int32)
                .Column("Width", DbType.Int32)                
			);

            ContentDefinitionManager.AlterPartDefinition("LocationPerspectivePartRecord", builder => builder.Attachable());


            return 1;
        }
        
        public int UpdateFrom1()
        {  

            ContentDefinitionManager.AlterTypeDefinition(
                "LocationPerspectiveWidget", cfg => cfg
                .WithPart("LocationPerspectivePart")
                .WithPart("WidgetPart")
                .WithPart("CommonPart")
                .WithSetting("Stereotype", "Widget"));
            return 2;
        }


        //public int UpdateFrom2()
        //{
        //    //// Creating table LocationPerspectivePartRecord
        //    //SchemaBuilder.CreateTable("LocationPerspectivePartRecord", table => table
        //    //    .ContentPartRecord()
        //    //    .Column("SourceDocuments", DbType.String)
        //    //    .Column("MapType", DbType.String)
        //    //    .Column("Height", DbType.Int32)
        //    //    .Column("Width", DbType.Int32)
        //    //);

        //    //ContentDefinitionManager.AlterPartDefinition("LocationPerspectivePartRecord", builder => builder.Attachable());

        //    ContentDefinitionManager.AlterTypeDefinition(
        //        "LocationPerspectiveWidget", cfg => cfg
        //        .WithPart("LocationPerspectivePart")
        //        .WithPart("WidgetPart")
        //        .WithPart("CommonPart")
        //        .WithSetting("Stereotype", "Widget"));
        //    return 3;
        //}

    }
}