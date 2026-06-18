interface ISimEngine;
  logic clk;
  logic rst_n;
  logic valid;
  logic ready;
  logic [255:0] context_hash;
  logic [255:0] result_hash;
endinterface

