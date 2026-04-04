using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace bank.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLastPaidDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "LastPaidDate",
                table: "RecurringExpenses",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastPaidDate",
                table: "RecurringExpenses");
        }
    }
}
